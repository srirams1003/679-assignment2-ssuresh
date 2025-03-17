// Set dimensions
const width = 800, height = 500;
const margin = { top: 50, right: 50, bottom: 50, left: 100 };

// Create an SVG
const svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

// Load CSV and process data
d3.csv("https://raw.githubusercontent.com/xiameng552180/CSCE-679-Data-Visualization-Assignment2/refs/heads/main/temperature_daily.csv").then(data => {
    // Convert date and temperature values
    data.forEach(d => {
        d.date = new Date(d.date);
        d.year = d.date.getFullYear();
        d.month = d.date.getMonth() + 1;  // 1-12
        d.max_temperature = +d.max_temperature;
        d.min_temperature = +d.min_temperature;
    });

    // Aggregate by month (get avg max/min per month per year)
    let aggregatedData = d3.rollup(
        data,
        v => ({
            max_temp: d3.max(v, d => d.max_temperature),
            min_temp: d3.min(v, d => d.min_temperature)
        }),
        d => d.year,
        d => d.month
    );

    // Extract unique years and months
    let years = [...new Set(data.map(d => d.year))].sort();
	years = years.slice(1); // starting from 1997 instead of 96
    let months = [...Array(12).keys()].map(d => d + 1);  // 1 to 12

    // Create scales
    let xScale = d3.scaleBand()
        .domain(years)
        .range([margin.left, width - margin.right])
        .padding(0.2);

    let yScale = d3.scaleBand()
        .domain(months)
        .range([margin.top, height - margin.bottom])
        .padding(0.2);

    let colorScale = d3.scaleSequential(d3.interpolateSpectral)
        .domain([d3.max(data, d => d.max_temperature), d3.min(data, d => d.min_temperature)]);

    // Append axes
    svg.append("g")
        .attr("transform", `translate(0,${margin.top})`)
        .call(d3.axisTop(xScale).tickFormat(d3.format("d")));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).tickFormat(d => d3.timeFormat("%B")(new Date(2000, d - 1, 1))));

    // Tooltip
    let tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "white")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("visibility", "hidden");

    // Initial mode: show max temperature
    let showMaxTemp = true;

	function updateMatrix() {
		svg.selectAll("rect").remove();

		svg.selectAll("rect")
			.data(years.flatMap(year => months.map(month => ({
				year, month, temp: showMaxTemp 
					? aggregatedData.get(year)?.get(month)?.max_temp 
					: aggregatedData.get(year)?.get(month)?.min_temp
				, max_temp : aggregatedData.get(year)?.get(month)?.max_temp
				, min_temp: aggregatedData.get(year)?.get(month)?.min_temp
			}))))
			.enter().append("rect")
			.attr("x", d => xScale(d.year))
			.attr("y", d => yScale(d.month))
			.attr("width", xScale.bandwidth())
			.attr("height", yScale.bandwidth())
			.attr("fill", d => d.temp !== undefined ? colorScale(d.temp) : "white")
			.on("mouseover", (event, d) => {
				tooltip.style("visibility", "visible")
					.text(`Date: ${d.year}-${String(d.month).padStart(2, "0")}; Max: ${d.max_temp}; Min: ${d.min_temp}`)
					.style("left", `${event.pageX + 10}px`)
					.style("top", `${event.pageY + 10}px`);
			})
			.on("mouseout", () => tooltip.style("visibility", "hidden"));

		d3.select("#switch_val").text(`Current Mode: ${showMaxTemp ? "Max Temperatures" : "Min Temperatures" }`);
	}

    // Add button to toggle max/min temperature
    d3.select("body").append("button")
        .text("Toggle Mode to see Min or Max Temperatures Graph")
        .on("click", () => {
            showMaxTemp = !showMaxTemp;
            updateMatrix();
        });


    // Draw initial matrix
    updateMatrix();
});
// modifying the already created SVG element to hold the legend
const newsvg = d3.select("#legend")
    .append("svg")
    .attr("width", 600) // Adjust width as needed
    .attr("height", 100); // Adjust height as needed

// Define the color scale
const legendColorScale = d3.scaleLinear()
    .interpolate(() => d3.interpolateSpectral) // Color interpolation
    .domain([40, 0]); // Keep domain as [0, 40] for correct labels

// Create a legend using d3-legend
const legend = d3.legendColor()
    .shapeWidth(30) // Width of each block in the legend
    .orient("horizontal") // Horizontal orientation
    .cells(11) // Number of blocks in the legend
    // .ascending(true) // Reverse the order of blocks without affecting labels
    .scale(legendColorScale) // Use the color scale defined above
	// .labels([0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40])
	.labels(["Coolest Recorded", "", "", "", "", "", "", "", "", "", "Hottest Recorded"])
    // .labelFormat(d3.format(".0f")) // Format labels as integers
    .title("Legend: Unit - Temperature"); // Add a title to the legend

// Append the legend to the SVG
newsvg.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(20,20)") // Position the legend within the SVG
    .call(legend);
