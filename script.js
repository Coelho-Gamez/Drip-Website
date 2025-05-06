// CSS has been moved to a separate file named "style.css".

// Declare global variables
const years = [];
const portfolioValues = [];
const totalDividendsPerYearList = [];
const stockPrices = [];
const stockAmounts = [];
const individualDividends = [];
const taxedIncomes = [];

// Utility function to normalize input values (replace commas with dots)
function normalizeInput(value) {
    if (typeof value === "string") {
        return parseFloat(value.replace(",", "."));
    }
    return parseFloat(value);
}

function calculateInvestment() {
    const initialAmountType = document.getElementById("initialAmountType").value;
    let initialMoney = 0;
    let initialStocks = 0;

    if (initialAmountType === "money") {
        initialMoney = normalizeInput(document.getElementById("initialMoney").value) || 0;
        initialStocks = Math.floor(initialMoney / normalizeInput(document.getElementById("stockPrice").value));
    } else if (initialAmountType === "stocks") {
        initialStocks = normalizeInput(document.getElementById("initialStocks").value) || 0;
    }

    // Use `initialStocks` in calculations
    let numStocks = initialStocks;

    // Get input values and normalize them
    const annualContribution = normalizeInput(document.getElementById("annualContribution").value) || 0;
    let stockPrice = normalizeInput(document.getElementById("stockPrice").value) || 0;
    const annualDividendPercentage = (normalizeInput(document.getElementById("annualDividend").value) || 0) / 100;
    const dividendFrequency = normalizeInput(document.getElementById("dividendFrequency").value) || 1;
    const holdingTimeInYears = parseInt(document.getElementById("holdingTime").value) || 0;
    let stockGrowthRate = (normalizeInput(document.getElementById("stockGrowth").value) || 0) / 100;
    let dividendGrowthRate = (normalizeInput(document.getElementById("dividendGrowth").value) || 0) / 100;
    const taxRate = (normalizeInput(document.getElementById("taxRate").value) || 0) / 100;
    const capitalGainsTaxRate = (normalizeInput(document.getElementById("capitalGainsTaxRate").value) || 0) / 100;
    const managementFee = (normalizeInput(document.getElementById("managementFee").value) || 0) / 100;
    const transactionFee = normalizeInput(document.getElementById("transactionFee").value) || 0;

    // Validate inputs
    if (holdingTimeInYears <= 0 || stockPrice <= 0 || numStocks <= 0 || dividendFrequency <= 0) {
        alert("Please enter valid values for all required fields.");
        return;
    }

    // Initialize variables
    let totalDividend = 0;
    let leftoverCash = 0;
    let totalCostBasis = numStocks * stockPrice;
    let totalStockValue = numStocks * stockPrice;

    let yearlySummaryHTML = "<table><thead><tr><th>Year</th><th>Stock Price ($)</th><th>Portfolio Value ($)</th><th>Stock Amount</th><th>Individual Div ($)</th><th>Total Dividends ($)</th><th>Taxed Income ($)</th></tr></thead><tbody>";

    // Clear arrays
    years.length = 0;
    portfolioValues.length = 0;
    totalDividendsPerYearList.length = 0;
    stockPrices.length = 0;
    stockAmounts.length = 0;
    individualDividends.length = 0;
    taxedIncomes.length = 0;

    for (let year = 1; year <= holdingTimeInYears; year++) {
        // Add annual contribution
        totalStockValue += annualContribution;
        leftoverCash += annualContribution;

        let individualDividend = annualDividendPercentage * stockPrice;
        let totalDividendsPerYear = individualDividend * numStocks * dividendFrequency;
        totalDividend += totalDividendsPerYear;
        let annualDividendAfterTax = totalDividendsPerYear * (1 - taxRate);

        // Reinvestment
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

        const taxedIncome = annualDividendAfterTax;

        // Update arrays
        years.push(year);
        portfolioValues.push(totalStockValue);
        totalDividendsPerYearList.push(totalDividendsPerYear);
        stockPrices.push(stockPrice);
        stockAmounts.push(Math.floor(numStocks));
        individualDividends.push(individualDividend);
        taxedIncomes.push(taxedIncome);

        yearlySummaryHTML += `<tr><td>${year}</td><td>${stockPrice.toFixed(2)}</td><td>${totalStockValue.toFixed(2)}</td><td>${Math.floor(numStocks)}</td><td>${individualDividend.toFixed(2)}</td><td>${totalDividendsPerYear.toFixed(2)}</td><td>${taxedIncome.toFixed(2)}</td></tr>`;
    }

    yearlySummaryHTML += "</tbody></table>";
    document.getElementById("yearly-summary").innerHTML = yearlySummaryHTML;

    // Calculate capital gains tax
    let capitalGains = totalStockValue - totalCostBasis;
    let capitalGainsTax = capitalGains > 0 ? capitalGains * capitalGainsTaxRate : 0;
    const finalPortfolioValueAfterTax = totalStockValue - capitalGainsTax;

    document.getElementById("finalPortfolioValue").textContent = finalPortfolioValueAfterTax.toFixed(2);
    document.getElementById("totalDividends").textContent = totalDividend.toFixed(2);
    document.getElementById("capitalGainsTax").textContent = capitalGainsTax.toFixed(2);
    document.getElementById("costBasis").textContent = totalCostBasis.toFixed(2);

    // Draw graphs
    drawLineGraph("portfolioValueChart", years, portfolioValues, "Portfolio Value Over Time", "Year", "Portfolio Value ($)", "rgba(75, 192, 192, 1)");
    drawBarGraph("dividendsChart", years, totalDividendsPerYearList, "Dividends Earned Per Year", "Year", "Dividends ($)", "rgba(153, 102, 255, 0.6)");
}

function exportToCSV() {
    const header = "Year,Stock Price ($),Portfolio Value ($),Stock Amount,Individual Div ($),Total Dividends ($),Taxed Income ($),Transaction Fee ($)\n";
    let csv = header;

    for (let i = 0; i < years.length; i++) {
        csv += `${years[i]},${stockPrices[i].toFixed(2)},${portfolioValues[i].toFixed(2)},${stockAmounts[i]},${individualDividends[i].toFixed(2)},${totalDividendsPerYearList[i].toFixed(2)},${taxedIncomes[i].toFixed(2)},${transactionFee.toFixed(2)}\n`;
    }

    csv += `\nFinal Portfolio Value ($),${document.getElementById("finalPortfolioValue").textContent}\n`;
    csv += `Total Dividends Earned ($),${document.getElementById("totalDividends").textContent}\n`;
    csv += `Capital Gains Tax Paid ($),${document.getElementById("capitalGainsTax").textContent}\n`;
    csv += `Cost Basis ($),${document.getElementById("costBasis").textContent}\n`;

    const filename = "investment_results.csv";
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, filename);
    } else {
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
        }
    }
}

function drawLineGraph(canvasId, labels, data, title, xLabel, yLabel, color) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Define margins and dimensions
    const margin = 50;
    const width = canvas.width - 2 * margin;
    const height = canvas.height - 2 * margin;

    // Find the max value in the data for scaling
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);

    // Draw axes
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, canvas.height - margin);
    ctx.lineTo(canvas.width - margin, canvas.height - margin);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw labels
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.fillText(title, canvas.width / 2, margin / 2);
    ctx.fillText(xLabel, canvas.width / 2, canvas.height - margin / 4);
    ctx.save();
    ctx.translate(margin / 4, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    // Draw data points and lines
    const xStep = width / (labels.length - 1);
    const yScale = height / (maxValue - minValue);

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    const points = [];

    data.forEach((value, index) => {
        const x = margin + index * xStep;
        const y = canvas.height - margin - (value - minValue) * yScale;

        points.push({ x, y, value });

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }

        // Draw data point
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.closePath();
    });

    ctx.stroke();

    // Add hover functionality
    canvas.addEventListener("mousemove", (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Clear previous tooltip
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Redraw graph
        drawLineGraph(canvasId, labels, data, title, xLabel, yLabel, color);

        points.forEach((point) => {
            const distance = Math.sqrt(
                Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2)
            );

            if (distance < 10) {
                // Draw tooltip
                ctx.beginPath();
                ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
                ctx.fillRect(point.x + 10, point.y - 25, 50, 20);
                ctx.fillStyle = "#fff";
                ctx.font = "12px sans-serif";
                ctx.fillText(point.value.toFixed(2), point.x + 35, point.y - 10);
                ctx.closePath();
            }
        });
    });
}

function drawBarGraph(canvasId, labels, data, title, xLabel, yLabel, color) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Define margins and dimensions
    const margin = 50;
    const width = canvas.width - 2 * margin;
    const height = canvas.height - 2 * margin;

    // Find the max value in the data for scaling
    const maxValue = Math.max(...data);

    // Draw axes
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, canvas.height - margin);
    ctx.lineTo(canvas.width - margin, canvas.height - margin);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw labels
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.fillText(title, canvas.width / 2, margin / 2);
    ctx.fillText(xLabel, canvas.width / 2, canvas.height - margin / 4);
    ctx.save();
    ctx.translate(margin / 4, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    // Draw bars
    const barWidth = width / labels.length - 10;
    const yScale = height / maxValue;

    data.forEach((value, index) => {
        const x = margin + index * (barWidth + 10);
        const y = canvas.height - margin - value * yScale;
        const barHeight = value * yScale;

        ctx.fillStyle = color;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Draw value above bar
        ctx.fillStyle = "#333";
        ctx.textAlign = "center";
        ctx.fillText(value.toFixed(2), x + barWidth / 2, y - 5);
    });
}

function resetForm() {
    document.getElementById("investmentForm").reset();
    document.getElementById("yearly-summary").innerHTML = "";
    document.getElementById("finalPortfolioValue").textContent = "";
    document.getElementById("totalDividends").textContent = "";
    document.getElementById("capitalGainsTax").textContent = "";
    document.getElementById("costBasis").textContent = "";
}

function useTemplate() {
    document.getElementById("annualContribution").value = "100";
    document.getElementById("numStocks").value = "20";
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
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const isDarkMode = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDarkMode ? "enabled" : "disabled");
}

// Check for saved dark mode preference on page load
document.addEventListener("DOMContentLoaded", () => {
    const darkModePreference = localStorage.getItem("darkMode");
    if (darkModePreference === "enabled") {
        document.body.classList.add("dark-mode");
    }
});

function importCSV() {
    const fileInput = document.getElementById("csvFile");
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a CSV file to import.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        const csvData = event.target.result;
        const rows = csvData.split("\n").map(row => row.split(","));

        // Assuming the CSV has the same order as the form fields
        const headers = rows[0];
        const values = rows[1];

        if (headers.length !== values.length) {
            alert("Invalid CSV format.");
            return;
        }

        // Map CSV values to form fields
        headers.forEach((header, index) => {
            const field = document.getElementById(header.trim());
            if (field) {
                field.value = values[index].trim();
            }
        });

        alert("CSV data imported successfully!");
    };

    reader.readAsText(file);
}

function switchInvestmentType(type) {
    // Hide all parameter sections
    document.getElementById("dividends-parameters").classList.add("hidden");
    document.getElementById("retirement-parameters").classList.add("hidden");

    // Show the selected parameter section
    if (type === "dividends") {
        document.getElementById("dividends-parameters").classList.remove("hidden");
    } else if (type === "retirement") {
        document.getElementById("retirement-parameters").classList.remove("hidden");
    }

    // Update active tab
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach(tab => tab.classList.remove("active"));
    document.querySelector(`.tab[onclick="switchInvestmentType('${type}')"]`).classList.add("active");
}

function toggleInitialAmountType() {
    const type = document.getElementById("initialAmountType").value;
    const moneyContainer = document.getElementById("initialMoneyContainer");
    const stocksContainer = document.getElementById("initialStocksContainer");

    if (type === "money") {
        moneyContainer.classList.remove("hidden");
        stocksContainer.classList.add("hidden");
    } else if (type === "stocks") {
        moneyContainer.classList.add("hidden");
        stocksContainer.classList.remove("hidden");
    }
}