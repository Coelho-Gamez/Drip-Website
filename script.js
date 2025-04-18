// Global variables
const years = [];
const portfolioValues = [];
const totalDividendsPerYearList = [];
const stockPrices = [];
const stockAmounts = [];
const individualDividends = [];
const taxedIncomes = [];

let investmentChartInstance = null;
let firstCalculationData = null;

function calculateInvestment() {
    // Get input values
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

    // Clear the arrays at the beginning of each calculation
    years.length = 0;
    portfolioValues.length = 0;
    totalDividendsPerYearList.length = 0;
    stockPrices.length = 0;
    stockAmounts.length = 0;
    individualDividends.length = 0;
    taxedIncomes.length = 0;

    for (let year = 1; year <= holdingTimeInYears; year++) {
        // Calculation logic
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

        yearlySummaryHTML += `<tr><td>${year}</td><td>${stockPrice.toFixed(2)}</td><td>${totalStockValue.toFixed(2)}</td><td>${Math.floor(numStocks)}</td><td>${individualDividend.toFixed(2)}</td><td>${totalDividendsPerYear.toFixed(2)}</td><td>${taxedIncome.toFixed(2)}</td></tr>`;
    }

    yearlySummaryHTML += "</tbody></table>";
    document.getElementById("yearly-summary").innerHTML = yearlySummaryHTML;

    const finalPortfolioValue = totalStockValue;
    const capitalGains = finalPortfolioValue - totalCostBasis;
    const capitalGainsTax = capitalGains > 0 ? capitalGains * capitalGainsTaxRate : 0;

    document.getElementById("finalPortfolioValue").textContent = finalPortfolioValue.toFixed(2);
    document.getElementById("totalDividends").textContent = totalDividend.toFixed(2);
    document.getElementById("capitalGainsTax").textContent = capitalGainsTax.toFixed(2);
    document.getElementById("costBasis").textContent = totalCostBasis.toFixed(2);

    renderChart(years, portfolioValues);

    document.getElementById('compareButton').disabled = false;
}

function renderChart(labels, data, label = 'Portfolio Value') {
    const chartCanvas = document.getElementById('investmentChart');
    const chartContext = chartCanvas.getContext('2d');

    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#d4d4d4' : '#333';
    const gridColor = isDarkMode ? '#555' : '#ccc';
    const lineColor = isDarkMode ? '#a78bfa' : '#6d28d9'; // Tailwind indigo-400/700

    if (investmentChartInstance) {
        investmentChartInstance.destroy();
    }

    investmentChartInstance = new Chart(chartContext, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                fill: false,
                borderColor: lineColor,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: textColor
                    }
                }
            }
        }
    });
}

let comparisonData = null;

function compareCalculations() {
    if (!firstCalculationData) {
        firstCalculationData = {
            years: [...years],
            portfolioValues: [...portfolioValues]
        };
        document.getElementById('compareButton').textContent = 'Compare with Previous';
        // Optionally, provide feedback to the user that the first calculation is saved
        return;
    }

    const secondCalculationData = {
        years: [...years],
        portfolioValues: [...portfolioValues]
    };

    const allYears = [...new Set([...firstCalculationData.years, ...secondCalculationData.years])].sort((a, b) => a - b);

    const firstValues = [];
    const secondValues = [];

    allYears.forEach(year => {
        const firstDataPoint = firstCalculationData.years.includes(year) ? firstCalculationData.portfolioValues[firstCalculationData.years.indexOf(year)] : null;
        const secondDataPoint = secondCalculationData.years.includes(year) ? secondCalculationData.portfolioValues[secondCalculationData.years.indexOf(year)] : null;
        firstValues.push(firstDataPoint);
        secondValues.push(secondDataPoint);
    });

    renderChart(allYears, firstValues, 'Scenario 1');
    renderChart(allYears, secondValues, 'Scenario 2'); // This will overwrite the first chart. Need to handle multiple datasets.

    const chartCanvas = document.getElementById('investmentChart');
    const chartContext = chartCanvas.getContext('2d');

    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#d4d4d4' : '#333';
    const gridColor = isDarkMode ? '#555' : '#ccc';
    const lineColor1 = isDarkMode ? '#a78bfa' : '#6d28d9'; // Tailwind indigo-400/700
    const lineColor2 = isDarkMode ? '#facc15' : '#eab308'; // Tailwind yellow-400/600


    if (investmentChartInstance) {
        investmentChartInstance.destroy();
    }

    investmentChartInstance = new Chart(chartContext, {
        type: 'line',
        data: {
            labels: allYears,
            datasets: [
                {
                    label: 'Scenario 1',
                    data: firstValues,
                    fill: false,
                    borderColor: lineColor1,
                    tension: 0.1
                },
                {
                    label: 'Scenario 2',
                    data: secondValues,
                    fill: false,
                    borderColor: lineColor2,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: textColor
                    }
                }
            }
        }
    });


    document.getElementById('compareButton').textContent = 'Compare';
    firstCalculationData = null; // Reset for the next comparison
}

function exportToCSV() {
    let csvContent = "Year,Portfolio Value,Total Dividends,Stock Price,Stock Amount,Individual Dividend,Taxed Income\n";
    for (let i = 0; i < years.length; i++) {
        csvContent += `${years[i]},${portfolioValues[i].toFixed(2)},${totalDividendsPerYearList[i].toFixed(2)},${stockPrices[i].toFixed(2)},${stockAmounts[i]},${individualDividends[i].toFixed(2)},${taxedIncomes[i].toFixed(2)}\n`;
    }

    csvContent += "\nFinal Totals\n";
    csvContent += `Final Portfolio Value,${document.getElementById("finalPortfolioValue").textContent}\n`;
    csvContent += `Total Dividends Earned,${document.getElementById("totalDividends").textContent}\n`;
    csvContent += `Capital Gains Tax Paid,${document.getElementById("capitalGainsTax").textContent}\n`;
    csvContent += `Cost Basis,${document.getElementById("costBasis").textContent}\n`;

    const filename = 'investment_results.csv';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}