const express = require('express');
const multer = require('multer');
const dateFns = require('date-fns');

const app = express();
const port = 3000;

// Setup for storing files in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {fileSize: 10 * 1024 * 1024}
});

// Serve static files (e.g., HTML, JS) from a directory named 'public'
app.use(express.static('public'));

// Handle file upload
app.post('/upload', upload.single('csv-file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  // Access the file buffer directly
  const fileBuffer = req.file.buffer;
  const fileContent = fileBuffer.toString('utf8');

  const content = csvProcess(fileContent);

  res.send(content)
});

function csvProcess(csvString) {
  let lines = csvString.split('\n');
  lines = lines.filter((value) => value !== '');

  const headers = lines.shift().split(','); // Assume first line is headers

  const data = lines.map(line => {
    const data = line.split(',');

    return headers.reduce((obj, nextKey, index) => {
      obj[nextKey] = data[index];
      return obj;
    }, {});
  });

  function processData(data) {

    function checkDateFormat(date) {
      const formatPatterns = {
        'yyyy-MM-dd': /^\d{4}-\d{2}-\d{2}$/,
        'MM/dd/yyyy': /^\d{2}\/\d{2}\/\d{4}$/,
        'dd.MM.yyyy': /^\d{2}\.\d{2}\.\d{4}$/,
        'yy/ddd': /^\d{2}\/\d{3}$/,
      };

      if (date.toLowerCase() === 'null') {
        return 'present';
      }

      for (const [format, pattern] of Object.entries(formatPatterns)) {
        if (pattern.test(date)) {
          return format;
        }
      }

      throw new Error('Invalid date format.');
    }

    const projectAssignments = {};

    for (const employee of data) {
      const projectID = employee['ProjectID'];

      if (!projectAssignments.hasOwnProperty(projectID)) {
        projectAssignments[projectID] = {};
      }

      let dateFrom = employee['DateFrom'];
      let dateTo = employee['DateTo'];

      dateFrom = dateFns.parse(employee['DateFrom'], checkDateFormat(dateFrom), new Date());
      dateTo = dateFns.parse(employee['DateTo'], checkDateFormat(dateTo), new Date());

      if (isNaN(dateTo)) {
        dateTo = new Date()
      }

      projectAssignments[projectID][employee['EmpID']] = {
        'dateFrom': dateFrom,
        'dateTo': dateTo
      }
    }


    function getWorkedTogether(projectAssignments) {
      const workedTogether = {};

      for (const projectID in projectAssignments) {
        const projectGroup = Object.entries(projectAssignments[projectID]);

        for (let i = 0; i < projectGroup.length; i++) {

          const employee1Info = projectGroup[i];

          for (let j = i + 1; j < projectGroup.length; j++) {

            const employee2Info = projectGroup[j];

            const empl1Start = employee1Info[1]['dateFrom'];
            const empl1End = employee1Info[1]['dateTo'];

            const empl2Start = employee2Info[1]['dateFrom'];
            const empl2End = employee2Info[1]['dateTo'];

            if (empl2End < empl1Start || empl2Start > empl1End) {
              continue; // No overlap
            }

            const latestStart = Math.max(empl1Start.getTime(), empl2Start.getTime());
            const earliestEnd = Math.min(empl1End.getTime(), empl2End.getTime());

            const diff = earliestEnd - latestStart;
            const diffDays = diff / (1000 * 60 * 60 * 24);

            const pairID = `${employee1Info[0]}${employee2Info[0]}`.split('')
                .sort((a, b) => a.localeCompare(b)).join('');

            if (!workedTogether.hasOwnProperty(pairID)) {
              workedTogether[pairID] = [0];
            }

            workedTogether[pairID][0] += diffDays;
            workedTogether[pairID].push({'empl1ID': employee1Info[0],
              'empl2ID': employee2Info[0], 'projID': projectID, 'days': Math.floor(diffDays)});

          }
        }
      }

      return workedTogether;
    }

    const workedTogether = getWorkedTogether(projectAssignments);

    function getPairsWorkedTogetherLongest(workedTogether) {
      const workedTogetherArray = Object.values(workedTogether);

      let longestTimeTogether = workedTogetherArray
          .sort((a, b) => b[0] - a[0])[0];

      for (let i = 1; i < workedTogetherArray.length; i++) {
        if (workedTogetherArray[i][0] !== longestTimeTogether[0]) {
          break;
        }

        workedTogetherArray[i].shift()

        longestTimeTogether = longestTimeTogether.concat(workedTogetherArray[i]);
      }

      return longestTimeTogether

    }

    return getPairsWorkedTogetherLongest(workedTogether)
  }

  return processData(data);
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
