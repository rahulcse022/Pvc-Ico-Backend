const getLevelIncomeOriginal = (totalBetAmount) => {
  if (totalBetAmount >= 100000) return { level: "V12", income: 2500 }; // ₹10 Cr
  if (totalBetAmount >= 50000) return { level: "V11", income: 1000 }; // ₹5 Cr
  if (totalBetAmount >= 10000) return { level: "V10", income: 100 }; // ₹1 Cr
  if (totalBetAmount >= 9000) return { level: "V9", income: 90 };
  if (totalBetAmount >= 8000) return { level: "V8", income: 80 };
  if (totalBetAmount >= 7000) return { level: "V7", income: 70 };
  if (totalBetAmount >= 6000) return { level: "V6", income: 60 };
  if (totalBetAmount >= 5000) return { level: "V5", income: 50 };
  if (totalBetAmount >= 4000) return { level: "V4", income: 40 };
  if (totalBetAmount >= 3000) return { level: "V3", income: 30 };
  if (totalBetAmount >= 2000) return { level: "V2", income: 20 };
  if (totalBetAmount >= 1000) return { level: "V1", income: 10 };
  return { level: "V0", income: 0 };
};

module.exports = getLevelIncomeOriginal;
