// Declare these variables in the global scope

const years = [];

const portfolioValues = [];

const totalDividendsPerYearList = [];

const stockPrices = [];

const stockAmounts = [];

const individualDividends = [];

const taxedIncomes = [];


function calculateInvestment() {

    // Get input values

    const annualContribution = parseFloat(document.getElementById("annualContribution").value);

    let numStocks = parseFloat(document.getElementById("numStocks").value);

    let stockPrice = parseFloat(document.getElementById("stockPrice").value);

    const annualDividendPercentage = parseFloat(document.getElementById("annualDividend").value) / 100;

    const dividendFrequency = parseFloat(document.getElementById("dividendFrequency").value);

    const holdingTimeInYears = parseInt(document.getElementById("holdingTime").value);

    let stockGrowthRate = parseFloat(document.getElementById("stockGrowth").value) / 100;

    let dividendGrowthRate = parseFloat(document.getElementById("dividendGrowth").value) / 100;

    const taxRate = parseFloat(document.getElementById("taxRate").value) / 100;

    const capitalGainsTaxRate = parseFloat(document.getElementById("capitalGainsTaxRate").value) / 100;

    const managementFee = parseFloat(document.getElementById("managementFee").value) / 100;

    const transactionFee = parseFloat(document.getElementById("transactionFee").value);


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

        // Add annual contribution

        totalStockValue += annualContribution;

        leftoverCash += annualContribution;


        let individualDividend = annualDividendPercentage * stockPrice;

        totalDividendsPerYear = individualDividend * numStocks * dividendFrequency;

        totalDividend += totalDividendsPerYear;

        let annualDividendAfterTax = totalDividendsPerYear * (1 - taxRate);


        // Reinvestment

        let totalReinvestment = annualDividendAfterTax + leftoverCash;

        if (totalReinvestment > transactionFee) {

            totalReinvestment -= transactionFee;

        } else {

            transactionFee = totalReinvestment;

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

        annualDividend *= (1 + dividendGrowthRate);


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


    // Calculate capital gains tax

    let capitalGains = totalStockValue - totalCostBasis;

    let capitalGainsTax = capitalGains > 0 ? capitalGains * capitalGainsTaxRate : 0;

    const finalPortfolioValueAfterTax = totalStockValue - capitalGainsTax;


    document.getElementById("finalPortfolioValue").textContent = finalPortfolioValueAfterTax.toFixed(2);

    document.getElementById("totalDividends").textContent = totalDividend.toFixed(2);

    document.getElementById("capitalGainsTax").textContent = capitalGainsTax.toFixed(2);

    document.getElementById("costBasis").textContent = totalCostBasis.toFixed(2);

}


function exportToCSV() {

    const header = "Year,Stock Price ($),Portfolio Value ($),Stock Amount,Individual Div ($),Total Dividends ($),Taxed Income ($)\n";

    let csv = header;


    for (let i = 0; i < years.length; i++) {

        csv += `${years[i]},${stockPrices[i].toFixed(2)},${portfolioValues[i].toFixed(2)},${stockAmounts[i]},${individualDividends[i].toFixed(2)},${totalDividendsPerYearList[i].toFixed(2)},${taxedIncomes[i].toFixed(2)}\n`;

    }


    csv += `\nFinal Portfolio Value ($),${document.getElementById("finalPortfolioValue").textContent}\n`;

    csv += `Total Dividends Earned ($),${document.getElementById("totalDividends").textContent}\n`;

    csv += `Capital Gains Tax Paid ($),${document.getElementById("capitalGainsTax").textContent}\n`;

    csv += `Cost Basis ($),${document.getElementById("costBasis").textContent}\n`;


    const filename = "investment_results.csv";

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });


    if (navigator.msSaveBlob) { // IE and Edge

        navigator.msSaveBlob(blob, filename);

    } else {

        const link = document.createElement("a");

        if (link.download !== undefined) { // Browsers that support HTML5 download attribute

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