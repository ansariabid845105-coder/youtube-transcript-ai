// ================================
// ELEMENTS
// ================================

const youtubeUrl = document.getElementById("youtubeUrl");
const generateBtn = document.getElementById("generateBtn");
const transcriptBox = document.getElementById("transcript");

const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");

const wordCount = document.getElementById("wordCount");
const characterCount = document.getElementById("characterCount");

const historyLink = document.getElementById("historyLink");
const homeLink = document.getElementById("homeLink");
const aboutLink = document.getElementById("aboutLink");

const historySection = document.getElementById("historySection");
const aboutSection = document.getElementById("aboutSection");

const historyList = document.getElementById("historyList");
const refreshHistoryBtn = document.getElementById("refreshHistoryBtn");

const statusText = document.getElementById("statusText");


// ================================
// BACKEND URL
// ================================

const API_URL = "https://youtube-transcript-api.onrender.com";


// ================================
// HELPER FUNCTIONS
// ================================

function getTranscriptText() {
    return transcriptBox.innerText.trim();
}


function updateStatistics(text) {

    if (!text) {
        wordCount.textContent = "0";
        characterCount.textContent = "0";
        return;
    }

    const words = text.split(/\s+/).filter(word => word.length > 0);

    wordCount.textContent = words.length;
    characterCount.textContent = text.length;
}


// ================================
// GENERATE TRANSCRIPT
// ================================

generateBtn.addEventListener("click", async function () {

    const url = youtubeUrl.value.trim();

    if (!url) {

        transcriptBox.textContent =
            "Please enter a YouTube URL.";

        statusText.textContent = "Error";

        updateStatistics("");

        return;
    }


    transcriptBox.textContent =
        "Fetching transcript...";

    statusText.textContent = "Fetching";


    try {

        const response = await fetch(
            `${API_URL}/transcripts`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    youtube_url: url
                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            transcriptBox.textContent =
                data.detail || "Something went wrong.";

            statusText.textContent = "Error";

            updateStatistics("");

            return;
        }


        transcriptBox.textContent =
            data.transcript;


        statusText.textContent = "Ready";


        updateStatistics(
            data.transcript
        );


        // Refresh history after generating
        loadHistory();


    } catch (error) {

        console.error(error);

        transcriptBox.textContent =
            "Could not connect to the backend.";

        statusText.textContent = "Offline";

        updateStatistics("");
    }

});


// ================================
// COPY TRANSCRIPT
// ================================

copyBtn.addEventListener("click", async function () {

    const text = getTranscriptText();


    if (!text) {

        alert("There is no transcript to copy.");

        return;
    }


    try {

        await navigator.clipboard.writeText(text);

        copyBtn.textContent = "✓ Copied";


        setTimeout(function () {

            copyBtn.textContent = "📋 Copy";

        }, 2000);


    } catch (error) {

        console.error(error);

        alert("Could not copy the transcript.");
    }

});


// ================================
// DOWNLOAD TRANSCRIPT
// ================================

downloadBtn.addEventListener("click", function () {

    const text = getTranscriptText();


    if (!text) {

        alert("There is no transcript to download.");

        return;
    }


    const blob = new Blob(
        [text],
        {
            type: "text/plain"
        }
    );


    const url = URL.createObjectURL(blob);


    const link = document.createElement("a");

    link.href = url;

    link.download = "transcript.txt";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

});


// ================================
// LOAD HISTORY
// ================================

async function loadHistory() {

    historyList.innerHTML =
        `<p class="history-empty">
            Loading history...
        </p>`;


    try {

        const response = await fetch(
            `${API_URL}/transcripts`
        );


        if (!response.ok) {

            throw new Error(
                "Failed to load history"
            );

        }


        const transcripts =
            await response.json();


        if (transcripts.length === 0) {

            historyList.innerHTML =
                `<p class="history-empty">
                    No transcripts saved yet.
                </p>`;

            return;
        }


        historyList.innerHTML = "";


        transcripts.forEach(function (item) {

            const historyItem =
                document.createElement("div");


            historyItem.className =
                "history-item";


            historyItem.innerHTML = `

                <div class="history-item-header">

                    <div>

                        <h3>
                            YouTube Transcript #${item.id}
                        </h3>

                        <p class="history-url">
                            ${item.youtube_url}
                        </p>

                    </div>

                    <span class="history-date">
                        ${formatDate(item.created_at)}
                    </span>

                </div>


                <div class="history-actions">

                    <button
                        class="open-btn"
                        data-id="${item.id}"
                    >
                        📖 Open
                    </button>


                    <button
                        class="delete-btn"
                        data-id="${item.id}"
                    >
                        🗑 Delete
                    </button>

                </div>

            `;


            historyList.appendChild(
                historyItem
            );

        });


        // Add button events

        document
            .querySelectorAll(".open-btn")
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const id =
                            this.dataset.id;

                        openTranscript(id);

                    }
                );

            });


        document
            .querySelectorAll(".delete-btn")
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const id =
                            this.dataset.id;

                        deleteTranscript(id);

                    }
                );

            });


    } catch (error) {

        console.error(error);

        historyList.innerHTML =
            `<p class="history-empty">
                Could not load history.
            </p>`;

    }

}


// ================================
// FORMAT DATE
// ================================

function formatDate(dateString) {

    if (!dateString) {
        return "Unknown date";
    }


    const date =
        new Date(dateString);


    return date.toLocaleString();

}


// ================================
// OPEN TRANSCRIPT
// ================================

async function openTranscript(id) {

    try {

        const response = await fetch(
            `${API_URL}/transcripts/${id}`
        );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.detail ||
                "Transcript not found."
            );

            return;
        }


        transcriptBox.textContent =
            data.transcript;


        youtubeUrl.value =
            data.youtube_url;


        updateStatistics(
            data.transcript
        );


        statusText.textContent =
            "Ready";


        // Go back to top / home section

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });


    } catch (error) {

        console.error(error);

        alert(
            "Could not open the transcript."
        );

    }

}


// ================================
// DELETE TRANSCRIPT
// ================================

async function deleteTranscript(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this transcript?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(
            `${API_URL}/transcripts/${id}`,
            {
                method: "DELETE"
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.detail ||
                "Could not delete transcript."
            );

            return;
        }


        // Reload history

        loadHistory();


    } catch (error) {

        console.error(error);

        alert(
            "Could not connect to the backend."
        );

    }

}


// ================================
// REFRESH HISTORY
// ================================

refreshHistoryBtn.addEventListener(
    "click",
    function () {

        loadHistory();

    }
);


// ================================
// NAVIGATION
// ================================

historyLink.addEventListener(
    "click",
    function (event) {

        event.preventDefault();

        historySection.scrollIntoView({
            behavior: "smooth"
        });

        loadHistory();

    }
);


homeLink.addEventListener(
    "click",
    function (event) {

        event.preventDefault();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }
);


aboutLink.addEventListener(
    "click",
    function (event) {

        event.preventDefault();

        aboutSection.scrollIntoView({
            behavior: "smooth"
        });

    }
);


// ================================
// INITIAL LOAD
// ================================

loadHistory();

updateStatistics("");