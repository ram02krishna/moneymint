import React from "react";
import { motion } from "framer-motion";

const AuthBranding = () => {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-900 to-purple-900 items-center justify-center p-12 text-center relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10"
      >
        <h1 className="text-5xl font-bold text-white mb-6 tracking-tight">
          MoneyMint
        </h1>
        <p className="text-xl text-purple-100 leading-relaxed max-w-md mx-auto">
          Take control of your finances with our intuitive and powerful expense
          tracking app.
        </p>
      </motion.div>
    </div>
  );
};

export default AuthBranding;
