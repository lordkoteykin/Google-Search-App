const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Route to handle search requests
app.get('/search', async (req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.status(400).send({ error: 'Query parameter is required' });
    }

    const googleSearchURL = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;

    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        // Set user agent to mimic a real browser
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // Navigate to the Google search page
        await page.goto(googleSearchURL, { waitUntil: 'domcontentloaded' });

        // Extract search results in the exact order they appear
        const results = await page.evaluate(() => {
            const elements = [...document.querySelectorAll('div.tF2Cxc')];
            return elements.map((element) => {
                const titleElement = element.querySelector('h3');
                const linkElement = element.querySelector('a');
                const descriptionElement = element.querySelector('.VwiC3b');

                return {
                    title: titleElement?.innerText || null,
                    url: linkElement?.href || null,
                    description: descriptionElement?.innerText || null,
                };
            });
        });

        await browser.close();

        // Filter out invalid results and maintain order
        const filteredResults = results.filter(
            (result) => result.title && result.url && result.url.startsWith('http')
        );

        if (filteredResults.length === 0) {
            return res.status(404).send({ error: 'No results found on Google' });
        }

        res.json(filteredResults);
    } catch (error) {
        console.error('Error fetching Google results with Puppeteer:', error.message);
        res.status(500).send({ error: 'Failed to fetch Google results' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
