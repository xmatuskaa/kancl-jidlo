# 🍽️ Kancl Jídlo - Daily Menu Scraper

A Nuxt.js application that scrapes daily menus from Czech restaurants in Brno.

## Features

- **Web Interface**: Beautiful, responsive UI showing daily menus from multiple restaurants
- **Day Selection**: Browse menus for any weekday (Monday through Friday) using convenient buttons
- **Standalone Script**: Command-line script for quick menu checking with day parameter support
- **Real-time Scraping**: Fresh data fetched on demand
- **Mobile Friendly**: Responsive design that works on all devices

## Supported Restaurants

1. **Šelepová** - `https://www.selepova.cz/denni-menu/`
2. **Plzeňský dvůr** - `https://www.plzenskydvur.cz/tydenni-menu`
3. **Light of India** - `http://www.lightofindia.cz/lang-cs/denni-menu`
4. **POKECZ** - Stable poké bowl menu
5. **Bistro Bastardo** - Mexican food menu
6. **TAO Restaurant** - `https://www.taorestaurant.cz/tydenni_menu/nabidka/` - Vietnamese & Japanese cuisine

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Web Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:3000` (or the port shown in the terminal)

3. Use the weekday buttons (Pondělí, Úterý, Středa, Čtvrtek, Pátek) to select which day's menu you want to view

4. Click "Aktualizovat menu" to fetch the menus for the selected day

### Standalone Script

Run the standalone scraper from the command line:

```bash
# Get today's menus
npm run scrape-menus

# Get menus for a specific day (1=Monday, 2=Tuesday, ..., 5=Friday)
node scripts/scrape-menus.js --day=1    # Monday
node scripts/scrape-menus.js --day=3    # Wednesday
node scripts/scrape-menus.js --day=5    # Friday
```

This will display the selected day's menus from all restaurants directly in your terminal.

## API Endpoint

The application also exposes an API endpoint at `/api/menus` that returns JSON data:

```bash
# Get today's menus
curl http://localhost:3000/api/menus

# Get menus for a specific day (1=Monday, 2=Tuesday, ..., 5=Friday)
curl http://localhost:3000/api/menus?day=1    # Monday
curl http://localhost:3000/api/menus?day=3    # Wednesday
curl http://localhost:3000/api/menus?day=5    # Friday
```

## Project Structure

```
jidlo/
├── app.vue                 # Main Vue application
├── nuxt.config.ts          # Nuxt configuration
├── package.json            # Dependencies and scripts
├── server/
│   └── api/
│       └── menus.get.js    # API endpoint for menu scraping
├── scripts/
│   └── scrape-menus.js     # Standalone scraping script
└── assets/
    └── css/
        └── main.css        # TailwindCSS styles
```

## Technologies Used

- **Nuxt.js 3** - Vue.js framework
- **TailwindCSS** - Utility-first CSS framework
- **Cheerio** - Server-side HTML parsing
- **Axios** - HTTP client for web scraping

## How It Works

The application uses web scraping to extract menu information from restaurant websites:

1. **Fetches HTML**: Uses Axios to retrieve the restaurant's webpage
2. **Parses Content**: Uses Cheerio to parse HTML and extract menu items
3. **Filters Results**: Applies filters to get relevant menu items for today
4. **Displays Data**: Shows the results in a clean, organized interface

## Customization

To add a new restaurant:

1. Add the restaurant configuration to the `restaurants` array in both:
   - `server/api/menus.get.js`
   - `scripts/scrape-menus.js`

2. Create a scraper function that parses the restaurant's specific HTML structure

3. Test the scraper to ensure it returns clean, formatted menu items

## Notes

- Some websites may change their structure, which could break scraping
- The scraper includes fallback mechanisms to handle different page structures
- Menu availability depends on the restaurant's website being accessible
- Results are filtered to show only today's menu when possible

## Development

To modify the scraping logic:

1. Check the HTML structure of the target website
2. Update the corresponding scraper function
3. Test with `npm run scrape-menus` or through the web interface
4. Adjust selectors and filters as needed

## License

This project is for educational and personal use only. Please respect the terms of service of the scraped websites.
