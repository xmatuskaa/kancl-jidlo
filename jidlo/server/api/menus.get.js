import axios from 'axios';
import * as cheerio from 'cheerio';

const restaurants = [
  {
    name: 'Šelepová',
    url: 'https://www.selepova.cz/denni-menu/',
    scraper: scrapeSelepovaMenu
  },
  {
    name: 'Plzeňský dvůr',
    url: 'https://www.plzenskydvur.cz/tydenni-menu',
    scraper: scrapePlzenskyDvurMenu
  },
  {
    name: 'Light of India',
    url: 'http://www.lightofindia.cz/lang-cs/denni-menu',
    scraper: scrapeLightOfIndiaMenu
  },
  {
    name: 'POKECZ',
    url: 'https://www.pokecz.cz/',
    scraper: scrapePokeczMenu
  },
  {
    name: 'Bistro Bastardo',
    url: 'https://bistro-bastardo.cz/',
    scraper: scrapeBistroBastardoMenu
  },
  {
    name: 'TAO Restaurant',
    url: 'https://www.taorestaurant.cz/tydenni_menu/nabidka/',
    scraper: scrapeTaoMenu
  }
];

async function fetchPage(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return null;
  }
}

async function scrapeSelepovaMenu(html, targetDay = null) {
  if (!html) return [];
  
  const $ = cheerio.load(html);
  const menuItems = [];
  
  // Get target day name in Czech
  let todayName;
  if (targetDay) {
    const dayNames = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
    todayName = dayNames[targetDay];
  } else {
    const today = new Date();
    const dayNames = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
    todayName = dayNames[today.getDay()];
  }
  
  // Get the page content as text
  const pageText = $('body').text();
  
  // Find today's section - look for day name + number pattern (e.g., "Středa9")
  const dayPattern = new RegExp(`${todayName.charAt(0).toUpperCase() + todayName.slice(1)}\\d+`, 'i');
  const dayMatch = pageText.match(dayPattern);
  
  if (dayMatch) {
    const dayIndex = pageText.indexOf(dayMatch[0]);
    
    // Find the next day or end of content
    const nextDayNames = ['pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota', 'neděle'];
    let endIndex = pageText.length;
    
    for (const nextDay of nextDayNames) {
      if (nextDay !== todayName) {
        const nextPattern = new RegExp(`${nextDay.charAt(0).toUpperCase() + nextDay.slice(1)}\\d+`, 'i');
        const nextMatch = pageText.substring(dayIndex + 50).match(nextPattern);
        if (nextMatch) {
          const nextIndex = dayIndex + 50 + pageText.substring(dayIndex + 50).indexOf(nextMatch[0]);
          if (nextIndex < endIndex) {
            endIndex = nextIndex;
          }
        }
      }
    }
    
    const todaySection = pageText.substring(dayIndex, endIndex);
    
    // Extract soup separately
    const soupMatch = todaySection.match(/Polévka:\s*([^]*?)(?=\S.*?\d+\s*Kč)/s);
    if (soupMatch) {
      const soup = soupMatch[1].trim().replace(/\s+/g, ' ');
      menuItems.push(`Polévka: ${soup}`);
    }
    
    // Extract individual menu items - look for specific patterns
    const menuItemPattern = /([^]*?)(\d+\s*Kč)\s*(Menu\s*\d+|Desert)/g;
    let match;
    
    while ((match = menuItemPattern.exec(todaySection)) !== null) {
      let dishText = match[1].trim().replace(/\s+/g, ' ');
      
      // Clean up - remove polévka part if it appears
      dishText = dishText.replace(/^.*?Polévka:.*?(?=\w)/s, '');
      // Remove any leftover menu references
      dishText = dishText.replace(/Menu\s*\d+.*$/i, '');
      dishText = dishText.replace(/Desert.*$/i, '');
      dishText = dishText.trim();
      
      if (dishText && !dishText.includes('Polévka:') && dishText.length > 10) {
        const price = match[2].trim();
        const menuType = match[3].trim();
        menuItems.push(`${dishText} - ${price} (${menuType})`);
      }
    }
  }
  
  return menuItems;
}

async function scrapePlzenskyDvurMenu(html, targetDay = null) {
  if (!html) return [];
  
  const $ = cheerio.load(html);
  const menuItems = [];
  
  // Get target day name in Czech
  let todayName;
  if (targetDay) {
    const dayNames = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
    todayName = dayNames[targetDay];
  } else {
    const today = new Date();
    const dayNames = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
    todayName = dayNames[today.getDay()];
  }
  
  const pageText = $('body').text();
  
  // Find today's section with date - e.g., "Středa 9. 7. 2025"
  const dayPattern = new RegExp(`${todayName.charAt(0).toUpperCase() + todayName.slice(1)}\\s+\\d+\\.\\s*\\d+\\.\\s*\\d+`, 'i');
  const dayMatch = pageText.match(dayPattern);
  
  if (dayMatch) {
    const dayIndex = pageText.indexOf(dayMatch[0]);
    
    // Find the next day section or end
    const nextDayNames = ['pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota', 'neděle', 'týdenní'];
    let endIndex = pageText.length;
    
    for (const nextDay of nextDayNames) {
      if (nextDay !== todayName) {
        const nextPattern = new RegExp(`${nextDay.charAt(0).toUpperCase() + nextDay.slice(1)}\\s+\\d+\\.\\s*\\d+\\.\\s*\\d+|${nextDay.charAt(0).toUpperCase() + nextDay.slice(1)}\\s+a\\s+víkendové`, 'i');
        const nextMatch = pageText.substring(dayIndex + 20).match(nextPattern);
        if (nextMatch) {
          const nextIndex = dayIndex + 20 + pageText.substring(dayIndex + 20).indexOf(nextMatch[0]);
          if (nextIndex < endIndex) {
            endIndex = nextIndex;
          }
        }
      }
    }
    
    const todaySection = pageText.substring(dayIndex, endIndex);
    
    // Extract soup
    const soupMatch = todaySection.match(/Polévka:\s*([^]*?)(?=\s*B:)/s);
    if (soupMatch) {
      const soupText = soupMatch[1].trim().replace(/\s+/g, ' ');
      menuItems.push(`Polévka: ${soupText}`);
    }
    
    // Extract menu A
    const menuAMatch = todaySection.match(/A:\s*([^]*?)(\d+\s*Kč)(?=\s*Polévka)/s);
    if (menuAMatch) {
      const dishText = menuAMatch[1].trim().replace(/\s+/g, ' ');
      const price = menuAMatch[2].trim();
      menuItems.push(`Menu A: ${dishText} - ${price}`);
    }
    
    // Extract menu B
    const menuBMatch = todaySection.match(/B:\s*([^]*?)(\d+\s*Kč)(?=\s*C:)/s);
    if (menuBMatch) {
      const dishText = menuBMatch[1].trim().replace(/\s+/g, ' ');
      const price = menuBMatch[2].trim();
      menuItems.push(`Menu B: ${dishText} - ${price}`);
    }
    
    // Extract menu C
    const menuCMatch = todaySection.match(/C:\s*([^]*?)(\d+\s*Kč)/s);
    if (menuCMatch) {
      const dishText = menuCMatch[1].trim().replace(/\s+/g, ' ');
      const price = menuCMatch[2].trim();
      menuItems.push(`Menu C: ${dishText} - ${price}`);
    }
  }
  
  return menuItems;
}

async function scrapeLightOfIndiaMenu(html, targetDay = null) {
  if (!html) return [];
  
  const $ = cheerio.load(html);
  const menuItems = [];
  
  // Get target day name in Czech
  let todayName;
  if (targetDay) {
    const dayNames = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
    todayName = dayNames[targetDay];
  } else {
    const today = new Date();
    const dayNames = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
    todayName = dayNames[today.getDay()];
  }
  
  // Light of India uses specific day names
  const lightOfIndiadays = {
    'pondělí': 'Pondělí',
    'úterý': 'Uterý', 
    'středa': 'Středa',
    'čtvrtek': 'Čtvrtek',
    'pátek': 'Pátek'
  };
  
  const searchDay = lightOfIndiadays[todayName];
  if (!searchDay) return [];
  
  const pageText = $('body').text();
  
  // Find today's section in the menu text - look for the day followed by "1."
  const dayIndex = pageText.indexOf(`${searchDay}1.`);
  
  if (dayIndex !== -1) {
    // Find the next day section or end
    const nextDayNames = ['Pondělí', 'Uterý', 'Středa', 'Čtvrtek', 'Pátek'];
    let endIndex = pageText.length;
    
    for (const nextDay of nextDayNames) {
      if (nextDay !== searchDay) {
        const nextIndex = pageText.indexOf(`${nextDay}1.`, dayIndex + 10);
        if (nextIndex !== -1 && nextIndex < endIndex) {
          endIndex = nextIndex;
        }
      }
    }
    
    // Also check for "Obsažené alergeny" as end marker
    const allergenIndex = pageText.indexOf('Obsažené alergeny', dayIndex);
    if (allergenIndex !== -1 && allergenIndex < endIndex) {
      endIndex = allergenIndex;
    }
    
    const todaySection = pageText.substring(dayIndex, endIndex);
    
    // Extract numbered items (1. through 7.) using a more flexible pattern
    const itemPattern = /(\d+)\.\s+([^]*?)(\d+Kč)\s*(\([^)]*\))/g;
    let match;
    
    while ((match = itemPattern.exec(todaySection)) !== null) {
      const dishText = match[2].trim().replace(/\s+/g, ' ');
      const price = match[3];
      const allergens = match[4];
      
      menuItems.push(`${dishText} - ${price} ${allergens}`);
    }
  }
  
  return menuItems;
}

async function scrapePokeczMenu(html, targetDay = null) {
  // POKECZ has a stable menu that doesn't change daily
  const menuItems = [
    'ATUNA MATATA -  tuňák, teriyaki, jarní cibulka, červené zelí, mrkev, mango, wakame, zázvor, koriandr, sezam, chips cibulka - 288 Kč',
    'HAWAIIAN POKÉ -  ponzu, dvojitá dávka masa ~ tuňák a losos, sriracha mayo, jarní cibulka, ředkvičky, koriandr, sezam, chips cibulka - 298 Kč',
    'FUNKY SALMON - ponzu, losos, jarní cibulka, sweet mayo, mungo klíčky, wakame, edamame, rajčata, pomeranč, koriandr, kešu, chips cibulka - 288 Kč',
    'CHICKEN POKÉ -  teriyaki, kuřecí maso, mango mayo, jarní cibulka, kukuřice, mrkev, edamame, okurek, ananas, koriandr, chips cibulka - 278 Kč',
    'SPICY SALMON -  ponzu, ostrý losos, jarní cibulka, červené zelí, wakame, edamame, ananas, takuan, arašídy, koriandr, chips cibulka - 288 Kč',
    'SPICY TUNA - ponzu, ostrý tuňák, jarní cibulka, červené zelí, wakame, edamame, ananas, takuan, arašídy, koriandr, chips cibulka - 288 Kč'
  ];
  
  return menuItems;
}

async function scrapeBistroBastardoMenu(html, targetDay = null) {
  // Bistro Bastardo has a stable menu
  const menuItems = [
    'Polévka dne - 55 Kč',
    'Burrito Barbacoa - 180 Kč',
    'Burrito Tinga - 165 Kč',
    'Quesadilla Pastor - 165 Kč',
    '3 Tacos Carnitas - 165 Kč'
  ];
  
  return menuItems;
}

async function scrapeTaoMenu(html, targetDay = null) {
  if (!html) return [];
  
  const $ = cheerio.load(html);
  const menuItems = [];
  
  // Get target day name in Czech
  let todayName;
  if (targetDay) {
    const dayNames = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
    todayName = dayNames[targetDay];
  } else {
    const today = new Date();
    const dayNames = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
    todayName = dayNames[today.getDay()];
  }
  
  const pageText = $('body').text();
  
  // Extract weekly menu items (M1-M9) - these are available all week
  // Split by menu sections and process each individually
  const menuSections = pageText.split(/(?=\d+\.\s*M\d+[,:]\s*|M\d+:)/);
  
  for (const section of menuSections) {
    // Look for menu items in each section - use backwards approach
    const menuMatch = section.match(/M(\d+)[,:]/);
    if (menuMatch) {
      const menuNumber = menuMatch[1];
      
      // Find the price in this section - handle Unicode normalization
      const normalizedSection = section.normalize('NFC');
      const priceMatch = normalizedSection.match(/(\d+)\s*kč\.?/i);
      if (priceMatch) {
        const price = priceMatch[1];
        
        // Get text before the price as the dish name
        const beforePrice = normalizedSection.substring(0, priceMatch.index).trim();
        const dishMatch = beforePrice.match(/M\d+[,:]\s*(.+)/);
        if (dishMatch) {
          let dishName = dishMatch[1].trim();
          
          // Clean up the dish name - remove emojis and extra symbols
          dishName = dishName.replace(/[🇻🇳🇯🇵🍏🥭🥑🍱]/g, '').replace(/\s+/g, ' ').trim();
          dishName = dishName.replace(/\.\.\./g, '').replace(/…/g, '').trim();
          
          // Remove allergen numbers at the end (like "1,3.." or "1,5,6,9")
          dishName = dishName.replace(/\s*[\d,.\s]*$/, '').trim();
          
          // Format the final dish name
          if (dishName.length > 5) {
            menuItems.push(`M${menuNumber}: ${dishName} - ${price} Kč`);
          }
        }
      }
    }
  }
  
  // Extract daily special based on target day
  const dayNames = {
    'pondělí': 'Pondělí',
    'úterý': 'Úterý',
    'středa': 'Středa',
    'čtvrtek': 'Čtvrtek',
    'pátek': 'Pátek'
  };
  
  const searchDay = dayNames[todayName];
  if (searchDay) {
    // Look for the daily special in the "Speciální" section
    const daySpecialPattern = new RegExp(`${searchDay}:([^]*?)(?=\\s*(Pondělí|Úterý|Středa|Čtvrtek|Pátek|Jídlo sebou):|$)`, 'i');
    const daySpecialMatch = pageText.match(daySpecialPattern);
    
    if (daySpecialMatch) {
      let specialText = daySpecialMatch[1].trim().replace(/\s+/g, ' ');
      
      // Clean up emojis and extra symbols
      specialText = specialText.replace(/[🇻🇳🇯🇵🍏🥭🥑🍱]/g, '').replace(/…/g, '').trim();
      
      // Extract price if present
      const priceMatch = specialText.match(/(\d+)\s*kč/i);
      if (priceMatch) {
        const price = priceMatch[1];
        // Clean up the text and format it nicely - remove allergen numbers at the end
        specialText = specialText.replace(/\s*\d+\s*kč.*$/i, '').trim();
        specialText = specialText.replace(/\s*\d+[,.\s]*$/, '').trim();
        menuItems.push(`Speciální ${todayName}: ${specialText} - ${price} Kč`);
      } else {
        menuItems.push(`Speciální ${todayName}: ${specialText}`);
      }
    }
  }
  
  return menuItems;
}

export default defineEventHandler(async (event) => {
  try {
    // Get day parameter from query string (1=Monday, 2=Tuesday, ..., 5=Friday)
    const query = getQuery(event);
    const dayParam = query.day ? parseInt(query.day) : null;
    
    // If no day specified, use current day
    let targetDay = dayParam;
    if (!targetDay) {
      const today = new Date();
      targetDay = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    }
    
    // Validate day (only Monday-Friday supported: 1-5)
    if (targetDay < 1 || targetDay > 5) {
      // If weekend or invalid day, default to Monday
      targetDay = 1;
    }
    
    const results = [];
    
    for (const restaurant of restaurants) {
      try {
        const html = await fetchPage(restaurant.url);
        const menuItems = await restaurant.scraper(html, targetDay);
        
        results.push({
          name: restaurant.name,
          url: restaurant.url,
          menuItems: menuItems,
          success: true,
          lastUpdated: new Date().toISOString()
        });
      } catch (error) {
        results.push({
          name: restaurant.name,
          url: restaurant.url,
          menuItems: [],
          success: false,
          error: error.message,
          lastUpdated: new Date().toISOString()
        });
      }
    }
    
    // Create a date for the target day
    const today = new Date();
    const currentWeekDay = today.getDay();
    const daysToAdd = targetDay - currentWeekDay;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
    
    return {
      success: true,
      selectedDay: targetDay,
      date: targetDate.toLocaleDateString('cs-CZ', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      restaurants: results
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      restaurants: []
    };
  }
});
