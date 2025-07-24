// --- Global Variables ---
let years = [], portfolioValues = [], totalDividendsPerYearList = [],
    stockPrices = [], stockAmounts = [], individualDividends = [], taxedIncomes = [];
let initialMoneyField, initialStocksField, stockPriceField, initialAmountTypeSelect;

// --- Utility Functions ---
function normalizeInput(value) {
    if (typeof value === "string") return parseFloat(value.trim().replace(",", "."));
    return parseFloat(value);
}
function formatNumber(value) {
    if (value >= 1e6 || value <= -1e6) return (value / 1e6).toFixed(2) + "m";
    if (value >= 1e3 || value <= -1e3) return (value / 1e3).toFixed(2) + "k";
    return value.toFixed(2);
}
function calculateNiceStep(range, numTicks) {
    if (range === 0) return 1;
    const desiredTickSpacing = range / (numTicks - 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(desiredTickSpacing)));
    const normalizedTickSpacing = desiredTickSpacing / magnitude;
    if (normalizedTickSpacing < 1.5) return 1 * magnitude;
    if (normalizedTickSpacing < 3) return 2 * magnitude;
    if (normalizedTickSpacing < 7.5) return 5 * magnitude;
    return 10 * magnitude;
}

// --- Calculation Logic ---
function calculateInvestment() {
    // Check required fields
    const requiredFields = [
        initialMoneyField,
        initialStocksField,
        stockPriceField,
        document.getElementById("annualContribution"),
        document.getElementById("annualDividend"),
        document.getElementById("dividendFrequency"),
        document.getElementById("holdingTime"),
        document.getElementById("stockGrowth"),
        document.getElementById("dividendGrowth"),
        document.getElementById("taxRate"),
        document.getElementById("capitalGainsTaxRate"),
        document.getElementById("managementFee"),
        document.getElementById("transactionFee")
    ];

    let allFilled = requiredFields.some(field => field && field.value !== "");
    if (!allFilled) {
        // Only show alert if nothing is filled at all
        alert("Please fill in the required fields before calculating.");
        return;
    }

    years = []; portfolioValues = []; totalDividendsPerYearList = [];
    stockPrices = []; stockAmounts = []; individualDividends = []; taxedIncomes = [];

    const initialAmountType = initialAmountTypeSelect.value;
    let initialMoney = 0, initialStocks = 0;
    if (initialAmountType === "money") {
        initialMoney = normalizeInput(initialMoneyField.value);
        initialStocks = Math.floor(initialMoney / normalizeInput(stockPriceField.value));
    } else {
        initialStocks = normalizeInput(initialStocksField.value);
    }
    let numStocks = initialStocks;
    const annualContribution = normalizeInput(document.getElementById("annualContribution").value) || 0;
    let stockPrice = normalizeInput(stockPriceField.value) || 0;
    let annualDividendPercentage = normalizeInput(document.getElementById("annualDividend").value) / 100.0;
    const dividendFrequency = normalizeInput(document.getElementById("dividendFrequency").value) || 1;
    const holdingTimeInYears = parseInt(document.getElementById("holdingTime").value) || 0;
    let stockGrowthRate = normalizeInput(document.getElementById("stockGrowth").value) / 100.0;
    let dividendGrowthRate = normalizeInput(document.getElementById("dividendGrowth").value) / 100.0;
    const taxRate = normalizeInput(document.getElementById("taxRate").value) / 100.0;
    const capitalGainsTaxRate = normalizeInput(document.getElementById("capitalGainsTaxRate").value) / 100.0;
    const managementFee = normalizeInput(document.getElementById("managementFee").value) / 100.0;
    const transactionFee = normalizeInput(document.getElementById("transactionFee").value) || 0;

    let totalDividend = 0, leftoverCash = 0, totalCostBasis = numStocks * stockPrice, totalStockValue = numStocks * stockPrice;
    let yearlySummaryHTML = "<table><thead><tr><th>Year</th><th>Stock Price ($)</th><th>Portfolio Value ($)</th><th>Stock Amount</th><th>Individual Div ($)</th><th>Total Dividends ($)</th></tr></thead><tbody>";

    for (let year = 1; year <= holdingTimeInYears; year++) {
        totalStockValue += annualContribution;
        leftoverCash += annualContribution;
        let individualDividend = annualDividendPercentage * stockPrice;
        let totalDividendsPerYear = individualDividend * numStocks * dividendFrequency;
        totalDividend += totalDividendsPerYear;
        let annualDividendAfterTax = totalDividendsPerYear * (1 - taxRate);
        let totalReinvestment = annualDividendAfterTax + leftoverCash - transactionFee;
        totalReinvestment = Math.max(totalReinvestment, 0);
        let newStocks = Math.floor(totalReinvestment / stockPrice);
        if (newStocks > 0) {
            totalCostBasis += newStocks * stockPrice;
            numStocks += newStocks;
            leftoverCash = totalReinvestment - newStocks * stockPrice;
        } else {
            leftoverCash = totalReinvestment;
        }
        totalStockValue = numStocks * stockPrice * (1 - managementFee);
        stockPrice *= (1 + stockGrowthRate);
        individualDividend *= (1 + dividendGrowthRate);

        years.push(year);
        portfolioValues.push(totalStockValue);
        totalDividendsPerYearList.push(totalDividendsPerYear);
        stockPrices.push(stockPrice);
        stockAmounts.push(Math.floor(numStocks));
        individualDividends.push(individualDividend);

        yearlySummaryHTML += `<tr><td>${year}</td><td>${formatNumber(stockPrice)}</td><td>${formatNumber(totalStockValue)}</td><td>${Math.floor(numStocks)}</td><td>${formatNumber(individualDividend)}</td><td>${formatNumber(totalDividendsPerYear)}</td></tr>`;
    }
    yearlySummaryHTML += "</tbody></table>";
    document.getElementById("yearly-summary-table-container").innerHTML = yearlySummaryHTML;

    let capitalGains = totalStockValue - totalCostBasis;
    let capitalGainsTax = capitalGains > 0 ? capitalGains * capitalGainsTaxRate : 0;
    const finalPortfolioValueAfterTax = totalStockValue - capitalGainsTax;

    document.getElementById("finalPortfolioValue").textContent = formatNumber(finalPortfolioValueAfterTax);
    document.getElementById("totalDividends").textContent = formatNumber(totalDividend);
    document.getElementById("capitalGainsTax").textContent = formatNumber(capitalGainsTax);
    document.getElementById("costBasis").textContent = formatNumber(totalCostBasis);

    drawBarGraph("portfolioValueChart", years, portfolioValues, "Portfolio Value Over Time", "Year", "Portfolio Value ($)", "rgba(75,192,192,1)");
    drawBarGraph("dividendsChart", years, totalDividendsPerYearList, "Dividends Earned Per Year", "Year", "Dividends ($)", "rgba(153,102,255,0.6)");
    drawBarGraph("stockPriceChart", years, stockPrices, "Stock Price Over Time", "Year", "Stock Price ($)", "rgba(255,206,86,0.8)");
}

// --- Graph Drawing ---
function drawBarGraph(canvasId, labels, data, title, xLabel, yLabel, color) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const margin = 70, width = canvas.width - 2 * margin, height = canvas.height - 2 * margin;
    const maxValue = Math.max(...data);
    const numYLabelsDesired = 5;
    const niceStep = calculateNiceStep(maxValue, numYLabelsDesired);
    const displayMax = Math.ceil(maxValue / niceStep) * niceStep;
    const displayRange = displayMax;

    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, canvas.height - margin);
    ctx.lineTo(canvas.width - margin, canvas.height - margin);
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "18px 'Inter', sans-serif";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(title, canvas.width / 2, margin / 2);

    ctx.font = "12px 'Inter', sans-serif";
    ctx.fillStyle = "#ccc";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const numXLabels = labels.length;
    const barSpacing = width / numXLabels;
    const barWidth = barSpacing * 0.7;

    labels.forEach((label, index) => {
        const x = margin + index * barSpacing + barSpacing / 2;
        ctx.fillText(label, x, canvas.height - margin + 15);
    });

    for (let yValue = 0; yValue <= displayMax; yValue += niceStep) {
        const y = canvas.height - margin - (yValue / displayMax) * height;
        ctx.textAlign = "right";
        ctx.fillText(formatNumber(yValue), margin - 10, y);
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(canvas.width - margin, y);
        ctx.strokeStyle = "#666";
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }

    data.forEach((value, index) => {
        const x = margin + index * barSpacing + (barSpacing - barWidth) / 2;
        const barHeight = (value / displayMax) * height;
        const y = canvas.height - margin - barHeight;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, barWidth, barHeight);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "12px 'Inter', sans-serif";
        ctx.fillText(formatNumber(value), x + barWidth / 2, y - 5);
    });
}

// --- UI Controls ---
function resetForm() {
    document.getElementById("investmentForm").reset();
    document.getElementById("yearly-summary-table-container").innerHTML = "";
    document.getElementById("finalPortfolioValue").textContent = "";
    document.getElementById("totalDividends").textContent = "";
    document.getElementById("capitalGainsTax").textContent = "";
    document.getElementById("costBasis").textContent = "";
    document.getElementById("initialAmountType").value = "money";
    toggleInitialAmountType();
    updateConvertedAmount();
    years = []; portfolioValues = []; totalDividendsPerYearList = [];
    stockPrices = []; stockAmounts = []; individualDividends = []; taxedIncomes = [];
    ["portfolioValueChart", "dividendsChart", "stockPriceChart"].forEach(id => {
        const canvas = document.getElementById(id);
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    });
    // Removed annoying popup
}
function useTemplate() {
    document.getElementById("annualContribution").value = "100";
    document.getElementById("stockPrice").value = "45";
    document.getElementById("annualDividend").value = "5";
    document.getElementById("dividendFrequency").value = "4";
    document.getElementById("holdingTime").value = "10";
    document.getElementById("stockGrowth").value = "7";
    document.getElementById("dividendGrowth").value = "3";
    document.getElementById("taxRate").value = "15";
    document.getElementById("capitalGainsTaxRate").value = "20";
    document.getElementById("managementFee").value = "1";
    document.getElementById("transactionFee").value = "10";
    initialAmountTypeSelect.value = "stocks";
    initialStocksField.value = "20";
    initialMoneyField.value = "";
    toggleInitialAmountType();
    updateConvertedAmount();
}

// --- CSV Import/Export ---
function importCSV() {
    const fileInput = document.getElementById("csvFile");
    const file = fileInput.files[0];
    if (!file) { alert("Please select a CSV file to import."); return; }
    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const csvData = event.target.result;
            const lines = csvData.split("\n").filter(line => line.trim() !== "");
            if (lines.length < 2) { alert("Error: CSV file is empty or contains only headers."); return; }
            const headers = lines[0].split(",").map(h => h.trim());
            const values = lines[1].split(",").map(v => v.trim());
            if (headers.length !== values.length) { alert("Error: CSV file header and data column count mismatch."); return; }
            const fieldMap = {
                "annualContribution": "annualContribution",
                "initialMoney": "initialMoney",
                "initialStocks": "initialStocks",
                "stockPrice": "stockPrice",
                "annualDividend": "annualDividend",
                "dividendFrequency": "dividendFrequency",
                "holdingTime": "holdingTime",
                "stockGrowth": "stockGrowth",
                "dividendGrowth": "dividendGrowth",
                "taxRate": "taxRate",
                "capitalGainsTaxRate": "capitalGainsTaxRate",
                "managementFee": "managementFee",
                "transactionFee": "transactionFee"
            };
            let initialAmountSet = false;
            headers.forEach((header, index) => {
                const formFieldId = fieldMap[header];
                if (formFieldId) {
                    const fieldElement = document.getElementById(formFieldId);
                    if (fieldElement) {
                        fieldElement.value = values[index];
                        if (formFieldId === "initialMoney" && values[index] !== "") {
                            initialAmountTypeSelect.value = "money";
                            initialAmountSet = true;
                        } else if (formFieldId === "initialStocks" && values[index] !== "") {
                            initialAmountTypeSelect.value = "stocks";
                            initialAmountSet = true;
                        }
                    }
                }
            });
            if (!initialAmountSet) initialAmountTypeSelect.value = "money";
            toggleInitialAmountType();
            updateConvertedAmount();
            alert("CSV data imported successfully!");
        } catch (e) {
            alert("Error processing CSV file: " + e.message);
        }
    };
    reader.readAsText(file);
}
function exportToCSV() {
    if (years.length === 0) {
        alert("No data to export. Please perform a calculation first.");
        return;
    }
    const header = "Year,Stock Price ($),Portfolio Value ($),Stock Amount,Individual Div ($),Total Dividends ($)\n";
    let csv = header;
    for (let i = 0; i < years.length; i++) {
        csv += `${years[i]},${formatNumber(stockPrices[i])},${formatNumber(portfolioValues[i])},${stockAmounts[i]},${formatNumber(individualDividends[i])},${formatNumber(totalDividendsPerYearList[i])}\n`;
    }
    csv += `\nFinal Totals\n`;
    csv += `Final Portfolio Value ($),${document.getElementById("finalPortfolioValue").textContent}\n`;
    csv += `Total Dividends Earned ($),${document.getElementById("totalDividends").textContent}\n`;
    csv += `Capital Gains Tax Paid ($),${document.getElementById("capitalGainsTax").textContent}\n`;
    csv += `Cost Basis ($),${document.getElementById("costBasis").textContent}\n`;
    const filename = "investment_results.csv";
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        alert("CSV file saved successfully!");
    } else {
        alert("Your browser does not support downloading files directly. Please copy the content.");
    }
}

// --- Initial Amount Type Toggle ---
function toggleInitialAmountType() {
    const type = initialAmountTypeSelect.value;
    const moneyContainer = document.getElementById("initialMoneyContainer");
    const stocksContainer = document.getElementById("initialStocksContainer");
    if (type === "money") {
        moneyContainer.classList.remove("hidden");
        stocksContainer.classList.add("hidden");
    } else {
        moneyContainer.classList.add("hidden");
        stocksContainer.classList.remove("hidden");
    }
}
function updateConvertedAmount() {
    const type = initialAmountTypeSelect.value;
    const currentStockPrice = normalizeInput(stockPriceField.value);
    if (isNaN(currentStockPrice) || currentStockPrice <= 0) {
        initialMoneyField.value = "";
        initialStocksField.value = "";
        return;
    }
    if (type === "money") {
        const currentMoneyValue = normalizeInput(initialMoneyField.value);
        if (!isNaN(currentMoneyValue) && currentMoneyValue >= 0) {
            initialStocksField.value = Math.floor(currentMoneyValue / currentStockPrice);
        } else {
            initialStocksField.value = "";
        }
    } else {
        const currentStocksValue = normalizeInput(initialStocksField.value);
        if (!isNaN(currentStocksValue) && currentStocksValue >= 0) {
            initialMoneyField.value = formatNumber(currentStocksValue * currentStockPrice);
        } else {
            initialMoneyField.value = "";
        }
    }
}

// --- Tab Switching ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId + '-tab').classList.remove('hidden');
    document.getElementById(tabId + 'Tab').classList.add('active');
    if (tabId === 'graphs' && years.length > 0) {
        drawBarGraph("portfolioValueChart", years, portfolioValues, "Portfolio Value Over Time", "Year", "Portfolio Value ($)", "rgba(75,192,192,1)");
        drawBarGraph("dividendsChart", years, totalDividendsPerYearList, "Dividends Earned Per Year", "Year", "Dividends ($)", "rgba(153,102,255,0.6)");
        drawBarGraph("stockPriceChart", years, stockPrices, "Stock Price Over Time", "Year", "Stock Price ($)", "rgba(255,206,86,0.8)");
    }
}

// --- Feedback Modal ---
function openFeedbackModal() {
    const feedbackModal = document.getElementById("feedbackModal");
    feedbackModal.classList.remove("hidden");
    feedbackModal.style.display = 'flex';
}
function closeFeedbackModal() {
    const feedbackModal = document.getElementById("feedbackModal");
    feedbackModal.style.display = 'none';
    feedbackModal.classList.add("hidden");
    document.getElementById("feedbackText").value = "";
}
function sendFeedback() {
    const feedback = document.getElementById("feedbackText").value;
    if (feedback.trim() === "") {
        alert("Please enter your feedback before sending.");
        return;
    }
    const googleFormUrl = "https://docs.google.com/forms/d/e/1FAIpQLSeWeWlcKMVfFqCoD3ReNywAsHeTIkFYuvJ3Q7rAWcWSGyMynw/viewform";
    const entryId = "entry.1185257695";
    let fullFormUrl = `${googleFormUrl}?${entryId}=${encodeURIComponent(feedback)}`;
    try {
        const newWindow = window.open(fullFormUrl, '_blank');
        if (newWindow) {
            closeFeedbackModal();
            alert("A new tab has opened with the feedback form. Please submit your feedback there. If you don't see it, please check your browser's pop-up blocker settings.");
        } else {
            alert("Your browser may have blocked the pop-up window for the feedback form. Please allow pop-ups for this site, or manually navigate to the Google Form to submit your feedback. Thank you!");
        }
    } catch (error) {
        alert("An error occurred while trying to open the feedback form. Please try again later. Error details: " + error.message);
    }
}

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    initialMoneyField = document.getElementById("initialMoney");
    initialStocksField = document.getElementById("initialStocks");
    stockPriceField = document.getElementById("stockPrice");
    initialAmountTypeSelect = document.getElementById("initialAmountType");

    initialAmountTypeSelect.addEventListener('change', () => {
        toggleInitialAmountType();
        updateConvertedAmount();
    });
    initialMoneyField.addEventListener('input', updateConvertedAmount);
    initialStocksField.addEventListener('input', updateConvertedAmount);
    stockPriceField.addEventListener('input', updateConvertedAmount);

    document.getElementById("calculateBtn").addEventListener('click', calculateInvestment);
    document.getElementById("resetBtn").addEventListener('click', resetForm);
    document.getElementById("useTemplateBtn").addEventListener('click', useTemplate);
    document.getElementById("importCsvBtn").addEventListener('click', () => document.getElementById('csvFile').click());
    document.getElementById("csvFile").addEventListener('change', importCSV);
    document.getElementById("exportCsvBtn").addEventListener('click', exportToCSV);

    document.getElementById("calculatorTab").addEventListener('click', () => switchTab('calculator'));
    document.getElementById("resultsTab").addEventListener('click', () => switchTab('results'));
    document.getElementById("graphsTab").addEventListener('click', () => switchTab('graphs'));

    toggleInitialAmountType();
    updateConvertedAmount();

    document.getElementById("openFeedbackBtn").addEventListener('click', openFeedbackModal);
    document.getElementById("sendFeedbackBtn").addEventListener('click', sendFeedback);
    document.getElementById("closeFeedbackBtn").addEventListener('click', closeFeedbackModal);

    document.getElementById("feedbackModal").style.display = 'none'; // Ensure hidden on load
});
