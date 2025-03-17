// Set dimensions
const width = 900, height = 600;
const margin = { top: 50, right: 50, bottom: 50, left: 100 };

// Create an SVG
const svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

// Load CSV and process data
d3.csv("https://raw.githubusercontent.com/xiameng552180/CSCE-679-Data-Visualization-Assignment2/main/temperature_daily.csv").then(data => {
    // Convert date and temperature values
    data.forEach(d => {
        d.date = new Date(d.date);
        d.year = d.date.getFullYear();
        d.month = d.date.getMonth() + 1;  // 1-12
        d.day = d.date.getDate();  // Extract day
        d.max_temperature = +d.max_temperature;
        d.min_temperature = +d.min_temperature;
    });

    // Filter to keep only the last 10 years
    let lastYear = d3.max(data, d => d.year);
    let filteredData = data.filter(d => d.year >= lastYear - 9);

    // Nest data by year & month
    let nestedData = d3.group(filteredData, d => d.year, d => d.month);

    let years = [...new Set(filteredData.map(d => d.year))].sort();
    let months = d3.range(1, 13); // Months 1-12

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
	.domain([d3.max(filteredData, d => d.max_temperature), d3.min(filteredData, d => d.min_temperature)]);
	// .domain([40,0]);


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

    function updateMatrix() {
        svg.selectAll(".cell-group").remove();

        let cells = svg.selectAll(".cell-group")
            .data(years.flatMap(year => months.map(month => ({
                year, month, data: nestedData.get(year)?.get(month) || []
            }))))
            .enter()
            .append("g")
            .attr("class", "cell-group")
            .attr("transform", d => `translate(${xScale(d.year)},${yScale(d.month)})`);

        // Add background rectangles for cells
        cells.append("rect")
            .attr("width", xScale.bandwidth())
            .attr("height", yScale.bandwidth())
            .attr("fill", d => {
                let monthData = d.data;
                if (monthData.length === 0) return "white";
                let maxTemp = d3.max(monthData, d => d.max_temperature);
                return colorScale(maxTemp);
            });

        // Draw mini line charts
        cells.each(function(d) {
            if (d.data.length === 0) return;

            let minTempData = d.data.map(day => ({ day: day.day, temp: day.min_temperature }));
            let maxTempData = d.data.map(day => ({ day: day.day, temp: day.max_temperature }));

            let xMini = d3.scaleLinear().domain([1, 31]).range([3, xScale.bandwidth() - 3]);
            let yMini = d3.scaleLinear()
                .domain([d3.min(d.data, d => d.min_temperature), d3.max(d.data, d => d.max_temperature)])
                .range([yScale.bandwidth() - 3, 3]);

            let line = d3.line().x(d => xMini(d.day)).y(d => yMini(d.temp));

            let cellSvg = d3.select(this)
                .append("foreignObject")
                .attr("width", xScale.bandwidth())
                .attr("height", yScale.bandwidth())
                .append("svg")
                .attr("width", xScale.bandwidth())
                .attr("height", yScale.bandwidth());

            // Min temperature line
            cellSvg.append("path")
                .datum(minTempData)
                .attr("d", line)
                .attr("stroke", "skyblue")
                .attr("stroke-width", 1.4)
                .attr("fill", "none")
                .style("pointer-events", "none");

            // Max temperature line
            cellSvg.append("path")
                .datum(maxTempData)
                .attr("d", line)
                .attr("stroke", "darkgreen")
                .attr("stroke-width", 1.4)
                .attr("fill", "none")
                .style("pointer-events", "none");
        });

        // Transparent overlay for tooltip events
        cells.append("rect")
            .attr("width", xScale.bandwidth())
            .attr("height", yScale.bandwidth())
            .attr("fill", "transparent")
            .on("mouseover", (event, d) => {
                if (d.data.length === 0) return;
                let maxTemp = d3.max(d.data, d => d.max_temperature);
                let minTemp = d3.min(d.data, d => d.min_temperature);
                tooltip.style("visibility", "visible")
                    .html(`Date: ${d.year}-${d.month}, max: ${maxTemp} min: ${minTemp} `)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY + 10}px`);
            })
            .on("mouseout", () => tooltip.style("visibility", "hidden"));
    }

    // Draw initial matrix
    updateMatrix();
});
