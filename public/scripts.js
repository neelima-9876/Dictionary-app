document.addEventListener("DOMContentLoaded", () => {
    const wordForm = document.querySelector('#wordForm');
    if (wordForm) {
        wordForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const wordInput = document.querySelector('#wordInput');
            const word = wordInput.value.trim();

            if (word) {
                try {
                    const response = await fetch(`/getMeaning?word=${word}`);
                    if (response.ok) {
                        const data = await response.json();
                        const wordMeaningDiv = document.querySelector('#wordMeaning');
                        wordMeaningDiv.innerHTML = `<h3>Meaning of ${word}:</h3><p>${data.meaning}</p>`;
                    } else {
                        console.error('Failed to fetch word meaning');
                    }
                } catch (error) {
                    console.error('Error:', error);
                }
            } else {
                alert('Please enter a word');
            }
        });
    }
});
