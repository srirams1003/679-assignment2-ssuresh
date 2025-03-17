// setting dimensions of the visual
const width = 900, height = 600;
const margin = { top: 50, right: 50, bottom: 50, left: 100 };

// create an SVG or the main body of the visual matrix
const svg = d3.select("body").append("svg")
.attr("width", width)
.attr("height", height);

// selected media button for temperature type (default to max)
let selectedTempType = "max";

// loading CSV and processing data
d3.csv("https://raw.githubusercontent.com/xiameng552180/CSCE-679-Data-Visualization-Assignment2/main/temperature_daily.csv").then(data => {
	// converting date and temperature values
	data.forEach(d => {
		d.date = new Date(d.date);
		d.year = d.date.getFullYear();
		d.month = d.date.getMonth() + 1;  // 1-12
		d.day = d.date.getDate();
		d.max_temperature = +d.max_temperature; // converting string to int
		d.min_temperature = +d.min_temperature; // converting string to int
	});

	// filter to keep only the last 10 years
	let lastYear = d3.max(data, d => d.year);
	let filteredData = data.filter(d => d.year >= lastYear - 9);

	// nesting data by year & month
	let nestedData = d3.group(filteredData, d => d.year, d => d.month);

	// extracting years list
	let years = [...new Set(filteredData.map(d => d.year))].sort();
	let months = d3.range(1, 13); // 1 - 12

	// creating scales
	let xScale = d3.scaleBand()
	.domain(years)
	.range([margin.left, width - margin.right])
	.padding(0.2);

	let yScale = d3.scaleBand()
	.domain(months)
	.range([margin.top, height - margin.bottom])
	.padding(0.2);

	// function to update color scale based on selected type
	function getColorScale() {
		let tempRange = [
			d3.max(filteredData, d => selectedTempType === "max" ? d.max_temperature : d.min_temperature),
			d3.min(filteredData, d => selectedTempType === "max" ? d.max_temperature : d.min_temperature)
		];
		return d3.scaleSequential(d3.interpolateSpectral).domain(tempRange);
	}

	// adding the X-axis to the svg
	svg.append("g")
		.attr("transform", `translate(0,${margin.top})`)
		.call(d3.axisTop(xScale).tickFormat(d3.format("d")));

	// adding the Y-axis to the svg
	svg.append("g")
		.attr("transform", `translate(${margin.left},0)`)
		.call(d3.axisLeft(yScale).tickFormat(d => d3.timeFormat("%B")(new Date(2000, d - 1, 1))));

	// tooltip stuff for hover functionality
	let tooltip = d3.select("body").append("div")
	.style("position", "absolute")
	.style("background", "white")
	.style("padding", "5px")
	.style("border-radius", "5px")
	.style("visibility", "hidden");

	function updateMatrix() {
		let colorScale = getColorScale();
		svg.selectAll(".cell-group").remove();

		let cells = svg.selectAll(".cell-group")
		.data(years.flatMap(year => months.map(month => ({
			year, month, data: nestedData.get(year)?.get(month) || []
		}))))
		.enter()
		.append("g")
		.attr("class", "cell-group")
		.attr("transform", d => `translate(${xScale(d.year)},${yScale(d.month)})`);

		// add the background canvas rectangles for each cell so we can draw the two lines on it
		cells.append("rect")
			.attr("width", xScale.bandwidth())
			.attr("height", yScale.bandwidth())
			.attr("fill", d => {
				let monthData = d.data;
				if (monthData.length === 0) return "white";
				let tempValue = selectedTempType === "max"
					? d3.max(monthData, d => d.max_temperature)
					: d3.min(monthData, d => d.min_temperature);
				return colorScale(tempValue);
			});

		// draw mini line charts
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
			.append("foreignObject") // appending the canvas
			.attr("width", xScale.bandwidth())
			.attr("height", yScale.bandwidth())
			.append("svg") // this is for the line chart
			.attr("width", xScale.bandwidth())
			.attr("height", yScale.bandwidth());

			// having different colors based on which mode to make the visual easy to read
			if (selectedTempType == "max"){
				// Min temperature line
				cellSvg.append("path")
					.datum(minTempData)
					.attr("d", line)
					.attr("stroke", "skyblue")
					.attr("stroke-width", 2)
					.attr("fill", "none");

				// Max temperature line
				cellSvg.append("path")
					.datum(maxTempData)
					.attr("d", line)
					.attr("stroke", "green")
					.attr("stroke-width", 2)
					.attr("fill", "none");
			} else {
				// Min temperature line
				cellSvg.append("path")
					.datum(minTempData)
					.attr("d", line)
					.attr("stroke", "cyan")
					.attr("stroke-width", 2)
					.attr("fill", "none");

				// Max temperature line
				cellSvg.append("path")
					.datum(maxTempData)
					.attr("d", line)
					.attr("stroke", "crimson")
					.attr("stroke-width", 2)
					.attr("fill", "none");
			}

		});

		// overlay for tooltip events when a call is hovered on
		cells.append("rect")
			.attr("width", xScale.bandwidth())
			.attr("height", yScale.bandwidth())
			.attr("fill", "transparent")
			.on("mouseover", (event, d) => {
				if (d.data.length === 0) return;
				let maxTemp = d3.max(d.data, d => d.max_temperature);
				let minTemp = d3.min(d.data, d => d.min_temperature);
				tooltip.style("visibility", "visible")
					.html(`date: ${d.year}-${d.month}, max: ${maxTemp} min: ${minTemp}`)
					.style("left", `${event.pageX + 10}px`)
					.style("top", `${event.pageY + 10}px`);
			})
			.on("mouseout", () => tooltip.style("visibility", "hidden"));
	}

	// event listener for toggle button
	d3.selectAll("input[name='tempType']").on("change", function() {
		selectedTempType = this.value;
		updateMatrix();
	});

	// drawing initial matrix
	updateMatrix();
});

// all the code below this point is for the legend
const newsvg = d3.select("#legend")
.append("svg")
.attr("width", 600) 
.attr("height", 100); 

const legendColorScale = d3.scaleLinear()
.interpolate(() => d3.interpolateSpectral)
.domain([40, 0]);

// creating a legend using d3-legend
const legend = d3.legendColor()
.shapeWidth(30) // width of each block in the legend
.orient("horizontal")
.cells(11) // number of blocks in the legend
.scale(legendColorScale)
// .labels([0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40])
.labels(["Coolest Recorded", "", "", "", "", "", "", "", "", "", "Hottest Recorded"])
.title("Legend: Unit - Temperature");

// appending the legend to the SVG
newsvg.append("g")
	.attr("class", "legend")
	.attr("transform", "translate(20,20)") // position of the legend within the SVG
	.call(legend);
