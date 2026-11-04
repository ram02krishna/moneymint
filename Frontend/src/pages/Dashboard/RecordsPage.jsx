import { useState, useContext } from "react";
import { useLocation } from "react-router-dom";
import { LuDownload, LuFileText } from "react-icons/lu";
import { UserContext } from "../../context/UserContextDefinition";
import { useToast } from "../../hooks/useToast";
import { useConfirm } from "../../hooks/useConfirm";
import { usePagedList } from "../../hooks/usePagedList";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import Modal from "../../components/layouts/Modal";
import LoadingSpinner from "../../components/LoadingSpinner";
import MonthSelector from "../../components/Dashboard/MonthSelector";
import PageHeader from "../../components/ui/PageHeader";
import Pagination from "../../components/ui/Pagination";
import RecordForm from "../../components/Records/RecordForm";
import RecordsOverview from "../../components/Records/RecordsOverview";
import TransactionsTable from "../../components/Transactions/TransactionsTable";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { generatePDF } from "../../utils/pdfGenerator";
import { getErrorMessage, toMonthKey, formatMonthLabel } from "../../utils/helper";

const PAGE_SIZE = 15;

/**
 * The Income and Expense pages are the same screen with different data and wording,
 * so both render this component with a config from RECORD_TYPES.
 */
const RecordsPage = ({ config }) => {
  const location = useLocation();
  const toast = useToast();
  const confirm = useConfirm();
  const { selectedMonth, setSelectedMonth } = useContext(UserContext);

  const [modalOpen, setModalOpen] = useState(() => !!location.state?.openAdd);
  const [editing, setEditing] = useState(null);

  const month = toMonthKey(selectedMonth);
  const { items: records, loading, error, page, setPage, totalPages, reload } = usePagedList({
    path: config.paths.list,
    month,
    pageSize: PAGE_SIZE,
    pick: (body) => ({ items: body.data[config.listKey], totalPages: body.totalPages }),
    errorMessage: `Failed to load ${config.singular} data. Please try again.`,
  });

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSave = async ({ _id, ...payload }) => {
    try {
      if (_id) await axiosInstance.put(config.paths.update(_id), payload);
      else await axiosInstance.post(config.paths.add, payload);

      toast.success(`${config.label} ${_id ? "updated" : "added"}`);
      closeModal();
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to save ${config.singular}. Please try again.`));
      throw err;
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: `Delete this ${config.singular}?`,
      message: "This can't be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;

    try {
      await axiosInstance.delete(config.paths.remove(id));
      toast.success(`${config.label} deleted`);
      // deleting the last row of a page should land on the previous page
      if (records.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to delete ${config.singular}.`));
    }
  };

  const handleDownload = async () => {
    try {
      const response = await axiosInstance.get(config.paths.download, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = config.downloadName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(`Couldn't download your ${config.singular} data. There may be nothing to export yet.`);
    }
  };

  // the PDF covers the whole month, not just the visible page
  const handlePdf = async () => {
    try {
      const { data } = await axiosInstance.get(`${API_PATHS.DASHBOARD.GET_MONTHLY_SUMMARY}?month=${month}`);
      const rows = (data.data.monthlyTransactions || []).filter((t) => t.type === config.type);
      await generatePDF(
        `${config.label} Report - ${formatMonthLabel(selectedMonth)}`,
        rows,
        [`${config.type}-trend-chart`, `${config.type}-breakdown-chart`],
        config.type,
      );
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't create the PDF. Please try again."));
    }
  };

  return (
    <DashboardLayout activeMenu={config.menu}>
      <div className="w-full max-w-[1400px] mx-auto">
        <PageHeader title={config.label} subtitle={formatMonthLabel(selectedMonth)} />

        <div className="space-y-6">
          <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

          {loading ? (
            <div className="flex items-center justify-center min-h-[320px]">
              <LoadingSpinner text={`Loading ${config.singular} data...`} />
            </div>
          ) : error ? (
            <div className="card text-center py-8">
              <p className="text-red-500">{error}</p>
              <button type="button" onClick={reload} className="btn-primary !w-auto mt-4">
                Retry
              </button>
            </div>
          ) : (
            <>
              <RecordsOverview config={config} transactions={records} onAdd={openAdd} />

              <div className="card w-full overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{config.label} Records</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {records.length} record{records.length !== 1 ? "s" : ""} on this page
                    </span>
                    <button type="button" className="card-btn" onClick={handlePdf}>
                      <LuFileText className="text-base" /> PDF
                    </button>
                    <button type="button" className="card-btn" onClick={handleDownload}>
                      <LuDownload className="text-base" /> Excel
                    </button>
                  </div>
                </div>

                <TransactionsTable data={records} onEdit={openEdit} onDelete={handleDelete} type={config.type} />
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            </>
          )}
        </div>

        <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? `Edit ${config.label}` : `Add ${config.label}`}>
          {/* key remounts the form so editing one record then another never shows stale values */}
          <RecordForm key={editing?._id || "new"} config={config} onSave={handleSave} onCancel={closeModal} editingData={editing} />
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default RecordsPage;
