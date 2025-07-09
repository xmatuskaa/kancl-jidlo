#!/usr/bin/env node

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
    
    // Extract soup
    const soupMatch = todaySection.match(/Polévka:\s*([^]*?)(?=\w.*?\d+\s*Kč)/s);
    if (soupMatch) {
      const soup = soupMatch[1].trim().replace(/\s+/g, ' ');
      menuItems.push(`Polévka: ${soup}`);
    }
    
    // Extract all menu items - find dishes followed by price and menu type
    const dishPatterns = [
      /([^]*?)(\d+\s*Kč)Menu\s*1/s,
      /([^]*?)(\d+\s*Kč)Menu\s*2/s,
      /([^]*?)(\d+\s*Kč)Menu\s*3/s,
      /([^]*?)(\d+\s*Kč)Menu\s*4/s,
      /([^]*?)(\d+\s*Kč)Desert/s
    ];
    
    const menuTypes = ['Menu 1', 'Menu 2', 'Menu 3', 'Menu 4', 'Desert'];
    
    dishPatterns.forEach((pattern, index) => {
      const match = todaySection.match(pattern);
      if (match) {
        let dishText = match[1].trim().replace(/\s+/g, ' ');
        
        // Clean up dish text - remove previous prices and menu info
        dishText = dishText.replace(/\d+\s*KčMenu\s*\d+.*$/i, '');
        dishText = dishText.replace(/\d+\s*KčDesert.*$/i, '');
        dishText = dishText.replace(/^.*?Polévka:.*?(?=\w)/s, '');
        dishText = dishText.trim();
        
        if (dishText && dishText.length > 5) {
          const price = match[2].trim();
          const menuType = menuTypes[index];
          menuItems.push(`${dishText}\n${price}\n${menuType}`);
        }
      }
    });
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
    
    // Add the day header
    menuItems.push(dayMatch[0]);
    
    // Extract menu A - look for A: followed by content until price
    const menuAMatch = todaySection.match(/A:\s*([^]*?)(\d+\s*Kč)(?=\s*Polévka)/s);
    if (menuAMatch) {
      menuItems.push('A:');
      const dishText = menuAMatch[1].trim().replace(/\s+/g, ' ');
      const price = menuAMatch[2].trim();
      menuItems.push(`${dishText}\n${price}`);
    }
    
    // Extract soup - look for "Polévka:" followed by text until "B:"
    const soupMatch = todaySection.match(/Polévka:\s*([^]*?)(?=\s*B:)/s);
    if (soupMatch) {
      menuItems.push('Polévka:');
      const soupText = soupMatch[1].trim().replace(/\s+/g, ' ');
      menuItems.push(soupText);
    }
    
    // Extract menu B
    const menuBMatch = todaySection.match(/B:\s*([^]*?)(\d+\s*Kč)(?=\s*C:)/s);
    if (menuBMatch) {
      menuItems.push('B:');
      const dishText = menuBMatch[1].trim().replace(/\s+/g, ' ');
      const price = menuBMatch[2].trim();
      menuItems.push(`${dishText}\n${price}`);
    }
    
    // Extract menu C - look until end of section
    const menuCMatch = todaySection.match(/C:\s*([^]*?)(\d+\s*Kč)/s);
    if (menuCMatch) {
      menuItems.push('C:');
      const dishText = menuCMatch[1].trim().replace(/\s+/g, ' ');
      const price = menuCMatch[2].trim();
      menuItems.push(`${dishText}\n${price}`);
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
    
    // Add day header
    menuItems.push(searchDay);
    
    // Extract numbered items (1. through 7.) using a more flexible pattern
    const itemPattern = /(\d+)\.\s+([^]*?)(\d+Kč)\s*(\([^)]*\))/g;
    let match;
    
    while ((match = itemPattern.exec(todaySection)) !== null) {
      const dishText = match[2].trim().replace(/\s+/g, ' ');
      const price = match[3];
      const allergens = match[4];
      
      menuItems.push(`${dishText} ${price} ${allergens}`);
    }
  }
  
  return menuItems;
}

async function main() {
  console.log('🍽️  Scraping daily menus...\n');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  let targetDay = null;
  
  // Look for --day=X parameter
  for (const arg of args) {
    if (arg.startsWith('--day=')) {
      const dayValue = parseInt(arg.split('=')[1]);
      if (dayValue >= 1 && dayValue <= 5) {
        targetDay = dayValue;
      }
    }
  }
  
  // Create date for display
  let displayDate;
  if (targetDay) {
    const today = new Date();
    const currentWeekDay = today.getDay();
    const daysToAdd = targetDay - currentWeekDay;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
    
    displayDate = targetDate.toLocaleDateString('cs-CZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } else {
    const today = new Date();
    displayDate = today.toLocaleDateString('cs-CZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  
  console.log(`📅 Target date: ${displayDate}\n`);
  
  for (const restaurant of restaurants) {
    try {
      console.log(`🏪 ${restaurant.name}`);
      console.log(`🔗 ${restaurant.url}`);
      
      const html = await fetchPage(restaurant.url);
      const menuItems = await restaurant.scraper(html, targetDay);
      
      console.log('📋 Menu:');
      if (menuItems.length > 0) {
        menuItems.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item}`);
        });
      } else {
        console.log('   ❌ No menu found for today');
      }
      
      console.log('\n' + '─'.repeat(80) + '\n');
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log('\n' + '─'.repeat(80) + '\n');
    }
  }
}

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
