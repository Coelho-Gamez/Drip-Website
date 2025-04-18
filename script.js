// Global variables (existing)
const years = [];
const portfolioValues = [];
const totalDividendsPerYearList = [];
const stockPrices = [];
const stockAmounts = [];
const individualDividends = [];
const taxedIncomes = [];

let investmentChartInstance = null; // To store the chart instance
let firstCalculationData = null; // To store data for comparison

function calculateInvestment() {
    // Get input values (existing)
    const annualContribution = parseFloat(document.getElementById("annualContribution").value) || 0;
    let numStocks = parseFloat(document.getElementById("numStocks").value) || 0;
    let stockPrice = parseFloat(document.getElementById("stockPrice").value) || 0;
    const annualDividendPercentage = parseFloat(document.getElementById("annualDividend").value) / 100 || 0;
    const dividendFrequency = parseFloat(document.getElementById("dividendFrequency").value) || 1;
    const holdingTimeInYears = parseInt(document.getElementById("holdingTime").value) || 0;
    let stockGrowthRate = parseFloat(document.getElementById("stockGrowth").value) / 100 || 0;
    let dividendGrowthRate = parseFloat(document.getElementById("dividendGrowth").value) / 100 || 0;
    const taxRate = parseFloat(document.getElementById("taxRate").value) / 100 || 0;
    const capitalGainsTaxRate = parseFloat(document.getElementById("capitalGainsTaxRate").value) / 100 || 0;
    const managementFee = parseFloat(document.getElementById("managementFee").value) / 100 || 0;
    const transactionFee = parseFloat(document.getElementById("transactionFee").value) || 0;

    let totalDividendsPerYear = 0;
    let totalDividend = 0;
    let leftoverCash = 0;
    let totalCostBasis = numStocks * stockPrice;
    let totalStockValue = numStocks * stockPrice;

    let yearlySummaryHTML = "<table><thead><tr><th>Year</th><th>Stock Price ($)</th><th>Portfolio Value ($)</th><th>Stock Amount</th><th>Individual Div ($)</th><th>Total Dividends ($)</th><th>Taxed Income ($)</th></tr></thead><tbody>";

    // Clear the arrays at the beginning of each calculation (existing)
    years.length = 0;
    portfolioValues.length = 0;
    totalDividendsPerYearList.length = 0;
    stockPrices.length = 0;
    stockAmounts.length = 0;
    individualDividends.length = 0;
    taxedIncomes.length = 0;

    for (let year = 1; year <= holdingTimeInYears; year++) {
        // Calculation logic (existing)
        totalStockValue += annualContribution;
        leftoverCash += annualContribution;

        let individualDividend = annualDividendPercentage * stockPrice;
        totalDividendsPerYear = individualDividend * numStocks * dividendFrequency;
        totalDividend += totalDividendsPerYear;
        let annualDividendAfterTax = totalDividendsPerYear * (1 - taxRate);

        let totalReinvestment = annualDividendAfterTax + leftoverCash;
        let currentTransactionFee = transactionFee;
        if (totalReinvestment >= currentTransactionFee) {
            totalReinvestment -= currentTransactionFee;
        } else {
            currentTransactionFee = totalReinvestment;
            totalReinvestment = 0;
        }

        let newStocks = Math.floor(totalReinvestment / stockPrice);
        if (newStocks > 0) {
            totalCostBasis += newStocks * stockPrice;
            numStocks += newStocks;
            leftoverCash = totalReinvestment - (newStocks * stockPrice);
        } else {
            leftoverCash = totalReinvestment;
        }

        totalStockValue = numStocks * stockPrice * (1 - managementFee);
        stockPrice *= (1 + stockGrowthRate);
        annualDividendPercentage *= (1 + dividendGrowthRate);

        const taxedIncome = annualDividendAfterTax;

        years.push(year);
        portfolioValues.push(totalStockValue);
        totalDividendsPerYearList.push(totalDividendsPerYear);
        stockPrices.push(stockPrice);
        stockAmounts.push(Math.floor(numStocks));
        individualDividends.push(individualDividend);
        taxedIncomes.push(taxedIncome);

        yearlySummaryHTML += `<tr><td>${year}