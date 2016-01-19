(function () {
  var margin = {top: 20, right: 80, bottom: 35, left: 50};
  var width = 960 - margin.left - margin.right;
  var height = 500 - margin.top - margin.bottom;

  var x = d3.scale.linear()
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient('bottom');

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient('left')
      .tickFormat(d3.format('.0%'));

  var line = d3.svg.line()
      .interpolate('monotone')
      .x(function (d) { return x(d.age); })
      .y(function (d) { return y(d.ratio); });

  var line2 = d3.svg.line()
      .interpolate('monotone')
      .x(function (d) { return x(d.age); })
      .y(function (d) { return y(d.ratio); });

  var svg = d3.select('.chart').append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
    .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  var xAxisSVG = svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + height + ')');
  xAxisSVG.append('text')
      .attr('y', 32)
      .attr('x', 405)
      .text('Age');

  var yAxisSVG = svg.append('g')
      .attr('class', 'y axis');

  var speciesData;
  var agesData;
  var agesMap;
  var totalSize;

  d3.select('.relative-checkbox').on('change', function () {
    if (this.checked) {
      setDataType('relative');
      drawChart();
    } else {
      setDataType('absolute');
      drawChart();
    }
  });

  function processData (data) {
    data = data.filter(function (d) {
      return d.year === 2009 &&
        d.age > 0 && d.age < 41 &&
        d.species.toLowerCase().indexOf('other') === -1;
    });

    speciesData = _(data)
      .groupBy('species')
      .map(function (data, speciesName) {
        return {
          species: speciesName,
          ages: _.sortBy(data, 'age'),
          totalSize: _.sum(data, 'size')
        };
      })
      .sortByOrder(['totalSize'], ['desc'])
      .slice(0, 20)
      .value();

    totalSize = _.sum(speciesData, 'totalSize');

    agesMap = speciesData.reduce(function (memo, species) {
      species.ages.forEach(function (v) {
        memo[v.age] = memo[v.age] ? memo[v.age] + v.size : v.size;
      });
      return memo;
    }, {});

    agesData = _.map(agesMap, function (v, k) {
      return {
        age: k,
        size: v
      };
    });
  }

  function setDataType (type) {
    // Set ratios
    speciesData.forEach(function (species) {
      species.ages.forEach(function (age) {
        if (type === 'absolute') {
          age.ratio = age.size / species.totalSize;
        } else {
          age.ratio = (age.size / species.totalSize) - (agesMap[age.age] / totalSize);
        }
      });
    });

    agesData.forEach(function (age) {
      if (type === 'absolute') {
        age.ratio = age.size / totalSize;
      } else {
        age.ratio = 0;
      }
    });

    x.domain([
      d3.min(speciesData, function (d) {
        return d3.min(d.ages, function (v) {
          return v.age;
        });
      }),
      d3.max(speciesData, function (d) {
        return d3.max(d.ages, function (v) {
          return v.age;
        });
      })
    ]);

    var yMin = d3.min(speciesData, function (d) {
      return d3.min(d.ages, function (v) {
        return v.ratio;
      });
    });

    var yMax = d3.max(speciesData, function (d) {
      return d3.max(d.ages, function (v) {
        return v.ratio;
      });
    });

    if (type === 'relative') {
      yMin = -Math.max(Math.abs(yMin), Math.abs(yMax));
      yMax = Math.max(Math.abs(yMin), Math.abs(yMax));
    }

    y.domain([yMin, yMax]);

    console.log("agesMap:", agesMap);
    console.log("agesData:", agesData);
    console.log('speciesData:', speciesData);
  }

  function mouseover (d) {
    d3.selectAll('.species')
      .classed('faded', true)
      .classed('hover', false);

    d3.select('.species.' + d.species.toLowerCase())
      .classed('faded', false)
      .classed('hover', true);

    d3.selectAll('.label')
      .classed('faded', true)
      .classed('hover', false);

    d3.select('.label.' + d.species.toLowerCase())
      .classed('faded', false)
      .classed('hover', true);
  }

  function mouseout (d) {
    d3.selectAll('.species')
      .classed('faded', false)
      .classed('hover', false);

    d3.selectAll('.label')
      .classed('faded', false)
      .classed('hover', false);
  }

  var baseline = svg.append('g').attr('class', 'total').append('path').attr('class', 'line');

  function drawChart () {
    xAxisSVG.call(xAxis);
    yAxisSVG.transition().duration(750).call(yAxis);

    d3.select('.labels')
      .selectAll('.label')
        .data(speciesData)
      .enter()
        .append('p')
        .attr('class', function (d) {
          return 'label ' + d.species.toLowerCase();
        })
        .html(function (d) {
          return d.species + ' (' + d.totalSize + ')';
        })
        .on('mouseover', mouseover)
        .on('mouseout', mouseout)
        .on('click', mouseover);

    var species = svg.selectAll('.species')
      .data(speciesData);

    species.enter()
      .append('g')
        .attr('class', function (d) {
          return 'species ' + d.species.toLowerCase();
        })
      .append('path')
        .attr('class', 'line')
        .attr('d', function (d) {
          return line(d.ages);
        });

    species.select('.line')
      .transition()
      .duration(750)
      .attr('d', function (d) {
        return line(d.ages);
      });

    baseline
      .datum(agesData)
      .transition()
      .duration(750)
      .attr('d', function (d) {
        return line2(d);
      });
  }

  d3.csv('data/data.csv')
    .row(function (d) {
      return {
        year: +d.Year,
        species: d.Species.replace('Animal', ''),
        age: +d.Age,
        size: +d.SampleSize
      };
    })
    .get(function (err, data) {
      if (!err) {
        processData(data);
        setDataType('absolute');
        drawChart();
      }
    });
})();
