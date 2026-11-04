import { useContext } from "react";
import { LuDownload, LuFileText } from "react-icons/lu";
import { UserContext } from "../../context/UserContextDefinition";
import { useToast } from "../../hooks/useToast";
import { usePagedList } from "../../hooks/usePagedList";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import MonthSelector from "../../components/Dashboard/MonthSelector";
import PageHeader from "../../components/ui/PageHeader";
import Pagination from "../../components/ui/Pagination";
import TransactionsTable from "../../components/Transactions/TransactionsTable";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { generatePDF } from "../../utils/pdfGenerator";
import { getErrorMessage, toMonthKey, formatMonthLabel } from "../../utils/helper";

const PAGE_SIZE = 15;

// Income and expenses for the chosen month, newest first.
const RecentTransactionsPage = () => {
  const toast = useToast();
  const { selectedMonth, setSelectedMonth } = useContext(UserContext);
  const month = toMonthKey(selectedMonth);

  const { items: transactions, loading, error, page, setPage, totalPages, reload } = usePagedList({
    path: API_PATHS.TRANSACTIONS.GET_ALL_TRANSACTIONS,
    month,
    pageSize: PAGE_SIZE,
    pick: (body) => ({ items: body.data.transactions, totalPages: body.pagination?.totalPages }),
    errorMessage: "Failed to load transaction data. Please try again.",
  });

  const handleDownloadExcel = async () => {
    try {
      const response = await axiosInstance.get(`${API_PATHS.TRANSACTIONS.DOWNLOAD_EXCEL}?month=${month}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `transactions_${month}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't download your transactions. Please try again.");
    }
  };

  // the PDF covers the whole month rather than only the visible page
  const handlePdf = async () => {
    try {
      const { data } = await axiosInstance.get(`${API_PATHS.DASHBOARD.GET_MONTHLY_SUMMARY}?month=${month}`);
      await generatePDF(`Transaction Report - ${formatMonthLabel(selectedMonth)}`, data.data.monthlyTransactions || [], [], "transaction");
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't create the PDF. Please try again."));
    }
  };

  return (
    <DashboardLayout activeMenu="Transactions">
      <div className="w-full max-w-[1400px] mx-auto">
        <PageHeader title="Transactions" subtitle={formatMonthLabel(selectedMonth)}>
          <button type="button" className="card-btn" onClick={handlePdf}>
            <LuFileText className="text-base" /> PDF
          </button>
          <button type="button" className="card-btn" onClick={handleDownloadExcel}>
            <LuDownload className="text-base" /> Excel
          </button>
        </PageHeader>

        <div className="space-y-6">
          <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

          {loading ? (
            <div className="flex items-center justify-center min-h-[320px]">
              <LoadingSpinner text="Loading transaction data..." />
            </div>
          ) : error ? (
            <div className="card text-center py-8">
              <p className="text-red-500">{error}</p>
              <button type="button" onClick={reload} className="btn-primary !w-auto mt-4">
                Retry
              </button>
            </div>
          ) : (
            <div className="card">
              <TransactionsTable data={transactions} showActions={false} />
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RecentTransactionsPage;
