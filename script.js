        // Declare global variables for consistency with Java version and better access across functions
        let years = [];
        let portfolioValues = [];
        let totalDividendsPerYearList = [];
        let stockPrices = [];
        let stockAmounts = [];
        let individualDividends = [];
        let taxedIncomes = [];

        // Global references to input fields for easier access across multiple functions
        // These will be initialized in the DOMContentLoaded event listener
        let initialMoneyField;
        let initialStocksField;
        let stockPriceField; // Added global reference for stock price field
        let initialAmountTypeSelect; // Added global reference for the select element


        // Utility function to normalize input values (replace commas with dots and parse)
        function normalizeInput(value) {
            if (typeof value === "string") {
                // Remove spaces and replace commas for consistent parsing
                return parseFloat(value.trim().replace(",", "."));
            }
            return parseFloat(value);
        }

        // Utility function to format numbers with prefixes (k, m) and two decimal places
        function formatNumber(value) {
            if (value >= 1000000 || value <= -1000000) {
                return (value / 1000000).toFixed(2) + "m";
            } else if (value >= 1000 || value <= -1000) {
                return (value / 1000).toFixed(2) + "k";
            }
            return value.toFixed(2);
        }

        /**
         * Function to calculate a "nice" step for axis tick values.
         * Based on algorithms used in charting libraries (e.g., JFreeChart, D3.js).
         * @param {number} range - The data range (max - min).
         * @param {number} numTicks - The approximate number of ticks desired.
         * @returns {number} A "nice" step value.
         */
        function calculateNiceStep(range, numTicks) {
            if (range === 0) { // Handle cases where range is zero to avoid division by zero
                return 1; // Default to a step of 1
            }
            const desiredTickSpacing = range / (numTicks - 1); // Desired spacing between ticks
            const magnitude = Math.pow(10, Math.floor(Math.log10(desiredTickSpacing))); // Closest power of 10
            const normalizedTickSpacing = desiredTickSpacing / magnitude; // Normalized spacing (between 1 and 10)

            // Determine nice increment based on normalized spacing
            if (normalizedTickSpacing < 1.5) {
                return 1 * magnitude;
            } else if (normalizedTickSpacing < 3) {
                return 2 * magnitude;
            } else if (normalizedTickSpacing < 7.5) {
                return 5 * magnitude;
            } else {
                return 10 * magnitude;
            }
        }


        // --- Core Calculation Logic ---
        function calculateInvestment() {
            // Clear arrays before new calculation to prevent old data from accumulating
            years.length = 0;
            portfolioValues.length = 0;
            totalDividendsPerYearList.length = 0;
            stockPrices.length = 0;
            stockAmounts.length = 0;
            individualDividends.length = 0;
            taxedIncomes.length = 0;

            // Get references to input fields (ensure these are up-to-date, though global ones are ideal)
            const initialAmountType = initialAmountTypeSelect.value; // Use global reference
            const annualContributionField = document.getElementById("annualContribution");
            const annualDividendField = document.getElementById("annualDividend");
            const dividendFrequencyField = document.getElementById("dividendFrequency");
            const holdingTimeField = document.getElementById("holdingTime");
            const stockGrowthField = document.getElementById("stockGrowth");
            const dividendGrowthField = document.getElementById("dividendGrowth");
            const taxRateField = document.getElementById("taxRate");
            const capitalGainsTaxRateField = document.getElementById("capitalGainsTaxRate");
            const managementFeeField = document.getElementById("managementFee");
            const transactionFeeField = document.getElementById("transactionFee");

            // --- Input Validation ---
            const fieldsToValidate = [
                { element: annualContributionField, name: "Annual contribution" },
                { element: stockPriceField, name: "Stock price" },
                { element: annualDividendField, name: "Annual dividend yield" },
                { element: dividendFrequencyField, name: "Dividend payout frequency" },
                { element: holdingTimeField, name: "Holding time" },
                { element: stockGrowthField, name: "Stock growth rate" },
                { element: dividendGrowthField, name: "Dividend growth rate" },
                { element: taxRateField, name: "Tax rate on dividends" },
                { element: capitalGainsTaxRateField, name: "Capital gains tax rate" },
                { element: managementFeeField, name: "Management fee" },
                { element: transactionFeeField, name: "Transaction fee" }
            ];

            let initialMoney = 0;
            let initialStocks = 0;

            if (initialAmountType === "money") {
                if (initialMoneyField.value.trim() === "") { showInputError("Please enter initial money."); return; }
                initialMoney = normalizeInput(initialMoneyField.value);
                if (initialMoney < 0) { showInputError("Initial money cannot be negative."); return; }
                if (normalizeInput(stockPriceField.value) <= 0) {
                    showInputError("Stock price must be positive to calculate initial stocks from money."); return;
                }
                initialStocks = Math.floor(initialMoney / normalizeInput(stockPriceField.value));
                if (initialStocks <= 0 && initialMoney > 0) { // If money exists but not enough for one stock
                    showInputError("Initial money is not enough to buy even one stock at the given price."); return;
                }
            } else if (initialAmountType === "stocks") {
                if (initialStocksField.value.trim() === "") { showInputError("Please enter initial number of stocks."); return; }
                initialStocks = normalizeInput(initialStocksField.value);
                if (initialStocks <= 0) { showInputError("Initial number of stocks must be positive."); return; }
            } else { // Should not happen with dropdown
                showInputError("Invalid initial amount type selected."); return;
            }

            for (const field of fieldsToValidate) {
                if (field.element.value.trim() === "") {
                    showInputError(`Please enter a value for ${field.name}.`);
                    return;
                }
                try {
                    const value = normalizeInput(field.element.value);
                    // Specific positive value checks
                    if ((field.name === "Stock price" || field.name === "Holding time" ||
                         field.name === "Dividend payout frequency") && value <= 0) {
                        showInputError(`${field.name} must be a positive value.`); return;
                    }
                    // Rates can be zero or positive, but not negative
                    if ((field.name.includes("rate") || field.name.includes("fee") || field.name === "Annual contribution") && value < 0) {
                        showInputError(`${field.name} cannot be negative.`); return;
                    }
                    // Validate percentages are not over 100
                    if ((field.name.includes("rate") || field.name.includes("fee")) && value > 100) {
                        showInputError(`${field.name} cannot exceed 100%.`); return;
                    }
                }  catch (e) {
                    showInputError(`Invalid numeric value for ${field.name}. Please enter a valid number.`);
                    return;
                }
            }

            // Get input values (normalized and converted to decimals for rates)
            const annualContribution = normalizeInput(annualContributionField.value);
            let currentNumStocks = initialStocks;
            let currentStockPrice = normalizeInput(stockPriceField.value);
            let annualDividendPercentage = normalizeInput(annualDividendField.value) / 100.0; // Decimal
            const dividendFrequency = normalizeInput(dividendFrequencyField.value);
            const holdingTimeInYears = parseInt(holdingTimeField.value);
            let stockGrowthRate = normalizeInput(stockGrowthField.value) / 100.0; // Decimal
            let dividendGrowthRate = normalizeInput(dividendGrowthField.value) / 100.0; // Decimal
            const taxRate = normalizeInput(taxRateField.value) / 100.0; // Decimal
            const capitalGainsTaxRate = normalizeInput(capitalGainsTaxRateField.value) / 100.0; // Decimal
            const managementFee = normalizeInput(managementFeeField.value) / 100.0; // Decimal
            const transactionFee = normalizeInput(transactionFeeField.value);

            // Initialize calculation variables
            let currentTotalDividendsEarned = 0; // Accumulator for total dividends over all years
            let currentCostBasis = initialStocks * currentStockPrice; // Initial cost basis
            let cashAvailableForReinvestment = initialMoney; // Start with initial money from "Money" selection

            // Clear previous table content before building new one
            const yearlySummaryTableContainer = document.getElementById("yearly-summary-table-container");
            yearlySummaryTableContainer.innerHTML = ""; // Clear existing content

            // Create table element
            const table = document.createElement("table");
            const thead = document.createElement("thead");
            const tbody = document.createElement("tbody");

            // Create header row
            const headerRow = document.createElement("tr");
            const headers = ["Year", "Stock Price ($)", "Portfolio Value ($)", "Stock Amount", "Individual Div ($)", "Total Dividends ($)", "Taxed Income ($)"];
            headers.forEach(text => {
                            const th = document.createElement("th");
                            th.textContent = text;
                            headerRow.appendChild(th);
                        });
            thead.appendChild(headerRow);
            table.appendChild(thead);
            table.appendChild(tbody);
            yearlySummaryTableContainer.appendChild(table); // Add table to container


            // --- Simulation Loop ---
            for (let year = 1; year <= holdingTimeInYears; year++) {
                // Calculate dividends for the current year
                const dividendPerStockThisYear = currentStockPrice * annualDividendPercentage;
                const totalDividendsPerCurrentYear = dividendPerStockThisYear * currentNumStocks * dividendFrequency;

                // Accumulate total dividends earned over the entire period
                currentTotalDividendsEarned += totalDividendsPerCurrentYear;

                // Calculate dividends after tax
                const taxedAmountThisYear = totalDividendsPerCurrentYear * taxRate;
                const netDividendsThisYear = totalDividendsPerCurrentYear - taxedAmountThisYear;

                // Combine cash for reinvestment: annual contribution + net dividends + remaining cash from previous year
                let amountToReinvest = annualContribution + netDividendsThisYear + cashAvailableForReinvestment;

                // Deduct transaction fees from the amount to reinvest
                if (amountToReinvest >= transactionFee) {
                    amountToReinvest -= transactionFee;
                } else {
                    amountToReinvest = 0; // No reinvestment if not enough for fee
                }

                let newStocksPurchased = 0;
                if (currentStockPrice > 0) {
                    newStocksPurchased = Math.floor(amountToReinvest / currentStockPrice);
                }

                // Update current number of stocks and cost basis
                currentNumStocks += newStocksPurchased;
                currentCostBasis += newStocksPurchased * currentStockPrice;

                // Update cash available for reinvestment (what's left after purchasing stocks)
                cashAvailableForReinvestment = amountToReinvest - (newStocksPurchased * currentStockPrice);

                // Apply market volatility to stock price (e.g., ±2% of base growth)
                const randomStockVolatilityFactor = (Math.random() * 2 - 1) * 0.02; // Between -0.02 and +0.02
                currentStockPrice *= (1 + stockGrowthRate + randomStockVolatilityFactor);

                // Grow annual dividend yield (applied to next year's calculation)
                annualDividendPercentage *= (1 + dividendGrowthRate);

                // Calculate current portfolio value *before* management fees are deducted for this year's display.
                // The management fee deduction is calculated and represented here as a reduction from the portfolio value.
                let currentPortfolioValueBeforeFee = currentNumStocks * currentStockPrice;
                const managementFeeAmount = currentPortfolioValueBeforeFee * managementFee;
                const currentPortfolioValue = currentPortfolioValueBeforeFee - managementFeeAmount;


                // Populate global arrays for graphs and CSV export
                years.push(year);
                portfolioValues.push(currentPortfolioValue);
                totalDividendsPerYearList.push(totalDividendsPerCurrentYear);
                stockPrices.push(currentStockPrice); // Stock price at end of year
                stockAmounts.push(Math.floor(currentNumStocks));
                individualDividends.push(dividendPerStockThisYear);
                taxedIncomes.push(taxedAmountThisYear);

                // Dynamically create and append table row and cells
                const row = document.createElement("tr");
                const rowData = [
                    year,
                    formatNumber(currentStockPrice),
                    formatNumber(currentPortfolioValue),
                    Math.floor(currentNumStocks),
                    formatNumber(dividendPerStockThisYear),
                    formatNumber(totalDividendsPerCurrentYear),
                    formatNumber(taxedAmountThisYear) 
                ];
                rowData.forEach(data => {
                    const td = document.createElement("td");
                    td.textContent = data;
                    row.appendChild(td);
                });
                tbody.appendChild(row); // Append row to tbody
            }

            // --- Final Totals Calculation ---
            const finalPortfolioValueBeforeTax = currentNumStocks * currentStockPrice;
            const capitalGains = finalPortfolioValueBeforeTax - currentCostBasis;
            const capitalGainsTax = capitalGains > 0 ? capitalGains * capitalGainsTaxRate : 0;

            const finalPortfolioValueAfterTax = finalPortfolioValueBeforeTax - capitalGainsTax;

            // Update final totals display - Use the span elements directly
            document.getElementById("finalPortfolioValue").textContent = formatNumber(finalPortfolioValueAfterTax);
            document.getElementById("totalDividends").textContent = formatNumber(currentTotalDividendsEarned);
            document.getElementById("capitalGainsTax").textContent = formatNumber(capitalGainsTax);
            document.getElementById("costBasis").textContent = formatNumber(currentCostBasis);

            // --- Draw Graphs ---
            drawLineGraph("portfolioValueChart", years, portfolioValues, "Portfolio Value Over Time", "", "", true); // Removed labels
            drawBarGraph("dividendsChart", years, totalDividendsPerYearList, "Dividends Earned Per Year", "", "", true); // Removed labels
            drawLineGraph("stockPriceChart", years, stockPrices, "Stock Price Over Time", "", "", true); // New graph, removed labels

            alert("Calculation complete! Check the Results and Graphs tabs.");
            switchTab('results'); // Automatically switch to the Results tab
        }

        // Helper for input validation errors
        function showInputError(message) {
            alert(message); // Using alert as in your original JS
        }

        // --- CSV Export Logic ---
        function exportToCSV() {
            if (years.length === 0) {
                alert("No data to export. Please perform a calculation first.");
                return;
            }

            const header = "Year,Stock Price ($),Portfolio Value ($),Stock Amount,Individual Div ($),Total Dividends ($),Taxed Income ($)\n";
            let csv = header;

            for (let i = 0; i < years.length; i++) {
                csv += `${years[i]},${formatNumber(stockPrices[i])},${formatNumber(portfolioValues[i])},${stockAmounts[i]},${formatNumber(individualDividends[i])},${formatNumber(totalDividendsPerYearList[i])},${formatNumber(taxedIncomes[i])}\n`;
            }

            csv += `\nFinal Totals\n`;
            csv += `Final Portfolio Value ($),${document.getElementById("finalPortfolioValue").textContent}\n`;
            csv += `Total Dividends Earned ($),${document.getElementById("totalDividends").textContent}\n`;
            csv += `Capital Gains Tax Paid ($),${document.getElementById("capitalGainsTax").textContent}\n`;
            csv += `Cost Basis ($),${document.getElementById("costBasis").textContent}\n`;

            const filename = "investment_results.csv";
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

            // Create a temporary link element to trigger the download
            const link = document.createElement("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url); // Clean up the URL object
                alert("CSV file saved successfully!");
            } else {
                alert("Your browser does not support downloading files directly. Please copy the content.");
            }
        }

        // --- Canvas Graphing Functions ---
        // Helper to get colors (now always dark mode colors)
        function getThemeColors(isDark) { // isDark parameter is now redundant but kept for function signature consistency
            return {
                chartBackground: '#333',
                plotBackground: '#333',
                axisColor: '#ccc',
                gridLineColor: '#666',
                labelColor: '#fff',
                lineSeriesColor: '#00FFFF', // Cyan
                barSeriesColor: 'rgba(153, 102, 255, 0.8)', // Purple
                tooltipBg: 'rgba(0, 0, 0, 0.8)',
                tooltipText: '#fff'
            };
        }

        // Line Graph Drawing Function (with improved hover/tooltip and nice Y-axis values, NO axis labels)
        function drawLineGraph(canvasId, labels, data, title, xLabel, yLabel, isDark) { // xLabel, yLabel parameters are now ignored
            const canvas = document.getElementById(canvasId);
            const ctx = canvas.getContext("2d");
            const colors = getThemeColors(isDark);

            // Clear the canvas fully
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Set background
            ctx.fillStyle = colors.plotBackground;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Increased left margin to make space for Y-axis numbers
            const margin = 70;
            const chartWidth = canvas.width - 2 * margin;
            const chartHeight = canvas.height - 2 * margin;

            // Find min/max values for data scaling
            const maxValue = Math.max(...data);
            const minValue = Math.min(...data);
            const range = maxValue - minValue;

            // Calculate "nice" step for Y-axis
            const numYLabelsDesired = 5; // Target around 5 labels
            const niceStep = calculateNiceStep(range, numYLabelsDesired);

            // Determine actual display min and max based on nice step
            const displayMin = Math.floor(minValue / niceStep) * niceStep;
            const displayMax = Math.ceil(maxValue / niceStep) * niceStep;
            const displayRange = displayMax - displayMin;


            // Draw axes
            ctx.beginPath();
            ctx.moveTo(margin, margin); // Top-left corner of the plot area
            ctx.lineTo(margin, canvas.height - margin); // Left vertical axis
            ctx.lineTo(canvas.width - margin, canvas.height - margin); // Bottom horizontal axis
            ctx.strokeStyle = colors.axisColor;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw grid lines and X-axis numbers
            ctx.font = "12px 'Inter', sans-serif";
            ctx.fillStyle = colors.axisColor;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const numXLabels = Math.min(labels.length, 10); // Limit number of X labels
            for (let i = 0; i < numXLabels; i++) {
                const labelIndex = Math.floor(i * (labels.length - 1) / (numXLabels - 1));
                const x = margin + (labelIndex / (labels.length - 1)) * chartWidth;
                ctx.fillText(labels[labelIndex], x, canvas.height - margin + 15); // X-axis tick numbers
                // Draw vertical grid lines
                ctx.beginPath();
                ctx.moveTo(x, canvas.height - margin);
                ctx.lineTo(x, margin);
                ctx.strokeStyle = colors.gridLineColor;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }

            // Draw Y-axis numbers and horizontal grid lines using nice steps
            for (let yValue = displayMin; yValue <= displayMax; yValue += niceStep) {
                const y = canvas.height - margin - (yValue - displayMin) / displayRange * chartHeight;
                ctx.textAlign = "right"; // Align text to the right, away from the axis line
                ctx.fillText(formatNumber(yValue), margin - 10, y); // Positioned 10px left of the increased margin
                // Draw horizontal grid lines
                ctx.beginPath();
                ctx.moveTo(margin, y);
                ctx.lineTo(canvas.width - margin, y);
                ctx.strokeStyle = colors.gridLineColor;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }

            // Draw main chart title (axis labels are removed)
            ctx.font = "18px 'Inter', sans-serif";
            ctx.fillStyle = colors.labelColor;
            ctx.textAlign = "center";
            ctx.fillText(title, canvas.width / 2, margin / 2); // Chart Title

            // Removed X-axis Label: ctx.fillText(xLabel, canvas.width / 2, canvas.height - margin + 35);
            // Removed Y-axis Label:
            // ctx.save();
            // ctx.translate(margin / 3, canvas.height / 2);
            // ctx.rotate(-Math.PI / 2);
            // ctx.fillText(yLabel, 0, 0);
            // ctx.restore();


            // Draw data points and lines
            ctx.beginPath();
            ctx.strokeStyle = colors.lineSeriesColor;
            ctx.lineWidth = 3; // Thicker line

            const points = []; // Store points for hover detection

            data.forEach((value, index) => {
                const x = margin + (index / (labels.length - 1)) * chartWidth;
                const y = canvas.height - margin - ((value - displayMin) / displayRange) * chartHeight;

                points.push({ x, y, value: data[index], label: labels[index] }); // Store actual data and label

                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke(); // Draw the line connecting points

            // Draw circles at data points after drawing the line
            ctx.fillStyle = colors.lineSeriesColor;
            points.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI); // Larger circles
                ctx.fill();
            });

            // Add hover functionality (this needs to redraw the entire graph on each move)
            canvas.onmousemove = (event) => {
                const rect = canvas.getBoundingClientRect();
                const mouseX = event.clientX - rect.left;
                const mouseY = event.clientY - rect.top;

                // Redraw graph (clears canvas and redraws everything) without tooltip for performance
                // IMPORTANT: Pass the *original* labels and data to avoid potential recursion issues with `points`
                drawLineGraph(canvasId, labels, data, title, "", "", true); // Pass empty strings for labels

                // Find the closest point and draw tooltip
                let closestPoint = null;
                let minDistance = Infinity;

                points.forEach((point) => {
                    const distance = Math.sqrt(
                        Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2)
                    );
                    if (distance < minDistance && distance < 15) { // Check for proximity
                        minDistance = distance;
                        closestPoint = point;
                    }
                });

                if (closestPoint) {
                    // Draw highlight circle
                    ctx.beginPath();
                    ctx.arc(closestPoint.x, closestPoint.y, 8, 0, 2 * Math.PI); // Larger highlight
                    ctx.strokeStyle = colors.tooltipBg;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.closePath();

                    // Draw tooltip background
                    const tooltipText = `Year: ${closestPoint.label}, Value: $${formatNumber(closestPoint.value)}`;
                    ctx.font = "14px 'Inter', sans-serif";
                    const textMetrics = ctx.measureText(tooltipText);
                    const tooltipWidth = textMetrics.width + 20; // Add padding
                    const tooltipHeight = 30;

                    let tooltipX = closestPoint.x + 15;
                    let tooltipY = closestPoint.y - tooltipHeight / 2;

                    // Adjust tooltip position if it's too close to the right edge
                    if (tooltipX + tooltipWidth > canvas.width - margin) {
                        tooltipX = closestPoint.x - 15 - tooltipWidth; // Move to the left of the point
                    }
                    // Adjust tooltip position if it's too close to the top edge
                    if (tooltipY < margin) {
                        tooltipY = margin;
                    }
                    // Adjust tooltip position if it's too close to the bottom edge
                    if (tooltipY + tooltipHeight > canvas.height - margin) {
                        tooltipY = canvas.height - margin - tooltipHeight;
                    }


                    ctx.fillStyle = colors.tooltipBg;
                    ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
                    ctx.fillStyle = colors.tooltipText;
                    ctx.textAlign = "left";
                    ctx.textBaseline = "middle";
                    ctx.fillText(tooltipText, tooltipX + 10, tooltipY + tooltipHeight / 2);
                }
            };
            canvas.onmouseleave = () => {
                // Redraw graph without tooltip when mouse leaves
                drawLineGraph(canvasId, labels, data, title, "", "", true); // Pass original data
            };
        }


        // Bar Graph Drawing Function (with nice Y-axis values, NO axis labels)
        function drawBarGraph(canvasId, labels, data, title, xLabel, yLabel, isDark) { // xLabel, yLabel parameters are now ignored
            const canvas = document.getElementById(canvasId);
            const ctx = canvas.getContext("2d");
            const colors = getThemeColors(isDark);

            // Clear the canvas fully
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Set background
            ctx.fillStyle = colors.plotBackground;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Increased left margin to make space for Y-axis numbers
            const margin = 70;
            const chartWidth = canvas.width - 2 * margin;
            const chartHeight = canvas.height - 2 * margin;

            // Find max value in the data for scaling
            const maxValue = Math.max(...data);
            const range = maxValue - 0; // Range from 0 to max

            // Calculate "nice" step for Y-axis
            const numYLabelsDesired = 5; // Target around 5 labels
            const niceStep = calculateNiceStep(range, numYLabelsDesired);

            // Determine actual display max based on nice step (min is 0 for bar charts)
            const displayMin = 0;
            const displayMax = Math.ceil(maxValue / niceStep) * niceStep;
            const displayRange = displayMax - displayMin;


            // Draw axes
            ctx.beginPath();
            ctx.moveTo(margin, margin);
            ctx.lineTo(margin, canvas.height - margin);
            ctx.lineTo(canvas.width - margin, canvas.height - margin);
            ctx.strokeStyle = colors.axisColor;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw main chart title (axis labels are removed)
            ctx.font = "18px 'Inter', sans-serif";
            ctx.fillStyle = colors.labelColor;
            ctx.textAlign = "center";
            ctx.fillText(title, canvas.width / 2, margin / 2); // Chart Title

            // Removed X-axis Label: ctx.fillText(xLabel, canvas.width / 2, canvas.height - margin + 35);
            // Removed Y-axis Label:
            // ctx.save();
            // ctx.translate(margin / 3, canvas.height / 2);
            // ctx.rotate(-Math.PI / 2);
            // ctx.fillText(yLabel, 0, 0);
            // ctx.restore();

            // Draw grid lines and X-axis numbers
            ctx.font = "12px 'Inter', sans-serif";
            ctx.fillStyle = colors.axisColor;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const numXLabels = labels.length; // All years as labels
            const barSpacing = chartWidth / numXLabels;
            const barWidth = barSpacing * 0.7; // 70% of spacing for the bar, 30% for gap

            labels.forEach((label, index) => {
                const x = margin + index * barSpacing + barSpacing / 2; // Center label under bar
                ctx.fillText(label, x, canvas.height - margin + 15); // X-axis tick numbers
            });

            // Draw Y-axis numbers and horizontal grid lines using nice steps
            for (let yValue = displayMin; yValue <= displayMax; yValue += niceStep) {
                const y = canvas.height - margin - (yValue - displayMin) / displayRange * chartHeight;
                ctx.textAlign = "right"; // Align text to the right, away from the axis line
                ctx.fillText(formatNumber(yValue), margin - 10, y); // Positioned 10px left of the increased margin
                // Draw horizontal grid lines
                ctx.beginPath();
                ctx.moveTo(margin, y);
                ctx.lineTo(canvas.width - margin, y);
                ctx.strokeStyle = colors.gridLineColor;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }


            // Draw bars
            data.forEach((value, index) => {
                const x = margin + index * barSpacing + (barSpacing - barWidth) / 2; // Position bar
                const barHeight = (value / displayMax) * chartHeight;
                const y = canvas.height - margin - barHeight;

                ctx.fillStyle = colors.barSeriesColor;
                ctx.fillRect(x, y, barWidth, barHeight);

                // Draw value above bar
                ctx.fillStyle = colors.labelColor;
                ctx.textAlign = "center";
                ctx.font = "12px 'Inter', sans-serif";
                ctx.fillText(formatNumber(value), x + barWidth / 2, y - 5);
            });
        }


        // --- UI Control Functions ---

        // Resets all input fields and clear results
        function resetForm() {
            document.getElementById("investmentForm").reset();
            // Clear the container directly before any new table creation
            document.getElementById("yearly-summary-table-container").innerHTML = "";
            document.getElementById("finalPortfolioValue").textContent = "";
            document.getElementById("totalDividends").textContent = "";
            document.getElementById("capitalGainsTax").textContent = "";
            document.getElementById("costBasis").textContent = "";
            document.getElementById("initialAmountType").value = "money"; // Reset dropdown
            toggleInitialAmountType(); // Update visibility
            updateConvertedAmount(); // Update converted amount after reset

            // Clear global arrays
            years.length = 0;
            portfolioValues.length = 0;
            totalDividendsPerYearList.length = 0;
            stockPrices.length = 0;
            stockAmounts.length = 0;
            individualDividends.length = 0;
            taxedIncomes.length = 0;

            // Clear canvases
            const portfolioCanvas = document.getElementById("portfolioValueChart");
            const dividendsCanvas = document.getElementById("dividendsChart");
            const stockPriceCanvas = document.getElementById("stockPriceChart"); // New canvas
            portfolioCanvas.getContext("2d").clearRect(0, 0, portfolioCanvas.width, portfolioCanvas.height);
            dividendsCanvas.getContext("2d").clearRect(0, 0, dividendsCanvas.width, dividendsCanvas.height);
            stockPriceCanvas.getContext("2d").clearRect(0, 0, stockPriceCanvas.width, stockPriceCanvas.height); // Clear new canvas

            alert("Form reset successfully!");
        }

        // Fills input fields with template values
        function useTemplate() {
            // Set common fields
            document.getElementById("annualContribution").value = "100";
            document.getElementById("stockPrice").value = "45"; // Ensure stock price is set
            document.getElementById("annualDividend").value = "5";
            document.getElementById("dividendFrequency").value = "4";
            document.getElementById("holdingTime").value = "10";
            document.getElementById("stockGrowth").value = "7";
            document.getElementById("dividendGrowth").value = "3";
            document.getElementById("taxRate").value = "15";
            document.getElementById("capitalGainsTaxRate").value = "20";
            document.getElementById("managementFee").value = "1";
            document.getElementById("transactionFee").value = "10";

            // Set the initial amount type to "stocks" for the template
            initialAmountTypeSelect.value = "stocks";
            initialStocksField.value = "20"; // Template value for initial stocks
            initialMoneyField.value = ""; // Clear money field initially

            // Call toggleInitialAmountType to ensure visibility is correct
            toggleInitialAmountType();
            // Then call updateConvertedAmount to calculate the money field based on the template stocks and price.
            updateConvertedAmount();
        }

        // Removed toggleDarkMode and updateToggleDarkModeButtonText functions as per user request.

        // Event listeners for feedback modal buttons
        document.addEventListener("DOMContentLoaded", () => {
            console.log("DOMContentLoaded event fired."); // Debugging: Confirm DOM is loaded
            try {
                // Initialize global field references
                initialMoneyField = document.getElementById("initialMoney");
                initialStocksField = document.getElementById("initialStocks");
                stockPriceField = document.getElementById("stockPrice"); // Initialize global stock price field
                initialAmountTypeSelect = document.getElementById("initialAmountType"); // Initialize global select element

                // Attach event listeners for type change and input changes
                initialAmountTypeSelect.addEventListener('change', () => {
                    toggleInitialAmountType();
                    updateConvertedAmount();
                });
                initialMoneyField.addEventListener('input', updateConvertedAmount);
                initialStocksField.addEventListener('input', updateConvertedAmount);
                stockPriceField.addEventListener('input', updateConvertedAmount);

                // Attach click listeners for buttons
                document.getElementById("calculateBtn").addEventListener('click', calculateInvestment);
                document.getElementById("resetBtn").addEventListener('click', resetForm);
                document.getElementById("useTemplateBtn").addEventListener('click', useTemplate);
                document.getElementById("importCsvBtn").addEventListener('click', () => {
                    document.getElementById('csvFile').click();
                });
                document.getElementById("csvFile").addEventListener('change', importCSV); // Listener for the file input itself
                document.getElementById("exportCsvBtn").addEventListener('click', exportToCSV);

                // Attach click listeners for tabs
                document.getElementById("calculatorTab").addEventListener('click', () => switchTab('calculator'));
                document.getElementById("resultsTab").addEventListener('click', () => switchTab('results'));
                document.getElementById("graphsTab").addEventListener('click', () => switchTab('graphs'));


                toggleInitialAmountType(); // Initialize the visibility of initial amount fields
                updateConvertedAmount(); // Also update converted amount on initial load


                // Explicitly ensure the feedback modal is hidden on load by setting its display style
                const feedbackModal = document.getElementById("feedbackModal");
                if (feedbackModal) {
                    feedbackModal.style.display = 'none';
                    console.log("Feedback modal initialized to hidden."); // Debugging: Confirm modal is hidden
                } else {
                    console.error("Error: feedbackModal element not found!"); // Debugging: Warn if modal element is missing
                }

                // Get button references for feedback modal
                const openFeedbackBtn = document.getElementById("openFeedbackBtn");
                const sendFeedbackBtn = document.getElementById("sendFeedbackBtn");
                const closeFeedbackBtn = document.getElementById("closeFeedbackBtn");

                // Attach event listeners for feedback modal
                if (openFeedbackBtn) {
                    openFeedbackBtn.addEventListener('click', openFeedbackModal);
                    console.log("Event listener attached to openFeedbackBtn."); // Debugging: Confirm listener attached
                } else {
                    console.error("Error: openFeedbackBtn element not found!"); // Debugging: Warn if button is missing
                }
                if (sendFeedbackBtn) {
                    sendFeedbackBtn.addEventListener('click', sendFeedback);
                    console.log("Event listener attached to sendFeedbackBtn.");
                }
                if (closeFeedbackBtn) {
                    closeFeedbackBtn.addEventListener('click', closeFeedbackModal);
                    console.log("Event listener attached to closeFeedbackBtn.");
                }
            } catch (error) {
                console.error("Error during DOMContentLoaded setup:", error); // Catch any errors during setup
            }
        });

        // Imports data from CSV file
        function importCSV() {
            const fileInput = document.getElementById("csvFile");
            const file = fileInput.files[0];

            if (!file) {
                alert("Please select a CSV file to import.");
                return;
            }

            const reader = new FileReader();
            reader.onload = function (event) {
                try {
                    const csvData = event.target.result;
                    const lines = csvData.split("\n").filter(line => line.trim() !== ""); // Filter empty lines

                    if (lines.length < 2) {
                        alert("Error: CSV file is empty or contains only headers.");
                        return;
                    }

                    const headers = lines[0].split(",").map(h => h.trim());
                    const values = lines[1].split(",").map(v => v.trim());

                    if (headers.length !== values.length) {
                        alert("Error: CSV file header and data column count mismatch. Please check CSV format.");
                        return;
                    }

                    // Map CSV values to form fields using an explicit mapping for robustness
                    const fieldMap = {
                        "annualContribution": "annualContribution",
                        "initialMoney": "initialMoney", // Expect "initialMoney" or "initialStocks" in CSV
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

                    let initialAmountSet = false; // Flag to check if initial type was set from CSV

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

                    // If CSV didn't specify initialMoney/Stocks, default to money
                    if (!initialAmountSet) {
                         initialAmountTypeSelect.value = "money";
                    }
                    toggleInitialAmountType(); // Update visibility based on loaded data
                    updateConvertedAmount(); // Update conversion after import

                    alert("CSV data imported successfully!");
                } catch (e) {
                    alert("Error processing CSV file: " + e.message + ". Please ensure it's correctly formatted.");
                    console.error("CSV import error:", e);
                }
            };

            reader.readAsText(file);
        }

        // Toggles visibility of initial money/stocks input fields
        function toggleInitialAmountType() {
            const type = initialAmountTypeSelect.value;
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

        // Function to update the converted initial amount when relevant fields change
        function updateConvertedAmount() {
            const type = initialAmountTypeSelect.value;
            const currentStockPrice = normalizeInput(stockPriceField.value);

            // If stock price is invalid, clear both conversion fields and exit
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
                    initialStocksField.value = ""; // Clear stocks if money is invalid or empty
                }
            } else if (type === "stocks") {
                const currentStocksValue = normalizeInput(initialStocksField.value);
                if (!isNaN(currentStocksValue) && currentStocksValue >= 0) {
                    initialMoneyField.value = formatNumber(currentStocksValue * currentStockPrice);
                } else {
                    initialMoneyField.value = ""; // Clear money if stocks is invalid or empty
                }
            }
        }


        // --- Tab Switching Logic ---
        function switchTab(tabId) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.add('hidden');
            });

            // Deactivate all tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });

            // Show the selected tab content
            document.getElementById(tabId + '-tab').classList.remove('hidden');

            // Activate the clicked tab
            document.getElementById(tabId + 'Tab').classList.add('active'); // Use ID for activation

            // Special handling for graphs tab
            if (tabId === 'graphs') {
                if (years.length > 0) { // Only draw if data exists
                    drawLineGraph("portfolioValueChart", years, portfolioValues, "Portfolio Value Over Time", "", "", true);
                    drawBarGraph("dividendsChart", years, totalDividendsPerYearList, "Dividends Earned Per Year", "", "", true);
                    drawLineGraph("stockPriceChart", years, stockPrices, "Stock Price Over Time", "", "", true); // Draw new stock price graph
                }
            }
        }

        // --- Feedback Modal Functions ---
        function openFeedbackModal() {
            console.log("openFeedbackModal called."); // Debugging: Confirm function call
            const feedbackModal = document.getElementById("feedbackModal");
            if (feedbackModal) {
                feedbackModal.classList.remove("hidden"); // Remove 'hidden' class
                feedbackModal.style.display = 'flex'; // Explicitly set display to flex
                console.log("Feedback modal displayed."); // Debugging: Confirm display change
            } else {
                console.error("openFeedbackModal: feedbackModal element not found!"); // Debugging: Warn if modal element is missing
            }
        }

        function closeFeedbackModal() {
            console.log("closeFeedbackModal called."); // Debugging: Confirm function call
            const feedbackModal = document.getElementById("feedbackModal");
            if (feedbackModal) {
                feedbackModal.style.display = 'none'; // Explicitly set display to none
                feedbackModal.classList.add("hidden"); // Add 'hidden' class
                document.getElementById("feedbackText").value = ""; // Clear textarea on close
                console.log("Feedback modal hidden."); // Debugging: Confirm hide change
            } else {
                console.error("closeFeedbackModal: feedbackModal element not found!"); // Debugging: Warn if modal element is missing
            }
        }

        function sendFeedback() {
            console.log("sendFeedback called.");
            const feedback = document.getElementById("feedbackText").value;
            if (feedback.trim() === "") {
                alert("Please enter your feedback before sending.");
                return;
            }

            const googleFormUrl = "https://docs.google.com/forms/d/e/1FAIpQLSeWeWlcKMVfFqCoD3ReNywAsHeTIkFYuvJ3Q7rAWcWSGyMynw/viewform";
            const entryId = "entry.1185257695"; // IMPORTANT: Ensure this is the correct Entry ID for your Google Form's feedback field!

            let fullFormUrl = `${googleFormUrl}?${entryId}=${encodeURIComponent(feedback)}`;

            try {
                const newWindow = window.open(fullFormUrl, '_blank');
                if (newWindow) {
                    // If window.open returns a valid window object, it means it likely succeeded (or was not immediately blocked)
                    closeFeedbackModal();
                    alert("A new tab has opened with the feedback form. Please submit your feedback there. If you don't see it, please check your browser's pop-up blocker settings.");
                } else {
                    // This 'else' block might be hit if a pop-up blocker immediately prevents the window from opening.
                    alert("Your browser may have blocked the pop-up window for the feedback form. Please allow pop-ups for this site, or manually navigate to the Google Form to submit your feedback. Thank you!");
                }
            } catch (error) {
                console.error("Error opening feedback form:", error);
                alert("An error occurred while trying to open the feedback form. Please try again later. Error details: " + error.message);
            }
        }
