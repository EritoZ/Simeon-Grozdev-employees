const buttonUpload = document.getElementById('upload-csv');
const fileInput = buttonUpload.previousElementSibling;
const buttonClearInput = buttonUpload.nextElementSibling;

buttonUpload.addEventListener('click', uploadFile);
buttonClearInput.addEventListener('click', clearInput);

function uploadFile(e) {
    e.preventDefault()
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file to upload.');
        return;
    }

    clearInput()

    if (!file.type.includes('csv')) {
        alert('The selected file is not a csv file.')
        return;
    }

    let formData = new FormData();
    formData.append('csv-file', file);

    fetch('/upload', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => displayProcessedInformation(data))
    .catch(error => {
        console.error('Upload failed:', error);
    });

    function displayProcessedInformation(data) {
        const tbody = document.querySelector('#dataGrid tbody');
        tbody.textContent = '';

        const tr = document.createElement('tr');

        const tdEmployee1ID = document.createElement('td');
        tdEmployee1ID.textContent = data['empl1ID'];
        tr.appendChild(tdEmployee1ID);

        const tdEmployee2ID = document.createElement('td');
        tdEmployee2ID.textContent = data['empl2ID'];
        tr.appendChild(tdEmployee2ID);

        const tdProject= document.createElement('td');
        tdProject.textContent = data['projID'];
        tr.appendChild(tdProject);

        const tdDays= document.createElement('td');
        tdDays.textContent = data['days'];
        tr.appendChild(tdDays);

        tbody.appendChild(tr);
    }
}

function clearInput(e) {
    fileInput.value = '';
}
