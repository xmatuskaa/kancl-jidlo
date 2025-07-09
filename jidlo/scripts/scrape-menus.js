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

async function scrapeSelepovaMenu(html) {
  if (!html) return [];
  
  const $ = cheerio.load(html);
  const menuItems = [];
  
  // Get today's day name in Czech
  const today = new Date();
  const dayNames = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  const todayName = dayNames[today.getDay()];
  
  // Get the page content as text
  const pageText = $('body').text();
  
  // Find today's section - look for "Středa9" pattern
  const dayPattern = new RegExp(`${todayName.charAt(0).toUpperCase() + todayName.slice(1)}\\d+`, 'i');
  const dayMatch = pageText.match(dayPattern);
  
  if (dayMatch) {
    const dayIndex = pageText.indexOf(dayMatch[0]);
    
    // Find the next day or end
    const nextDayNames = ['pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota', 'neděle'];
    let endIndex = pageText.length;
    
    for (const nextDay of nextDayNames) {
      if (nextDay !== todayName) {
        const nextPattern = new RegExp(`${nextDay.charAt(0).toUpperCase() + nextDay.slice(1)}\\d+`, 'i');
        const nextMatch = pageText.substring(dayIndex + 10).match(nextPattern);
        if (nextMatch) {
          const nextIndex = dayIndex + 10 + pageText.substring(dayIndex + 10).indexOf(nextMatch[0]);
          if (nextIndex < endIndex) {
            endIndex = nextIndex;
          }
        }
      }
    }
    
    const todaySection = pageText.substring(dayIndex, endIndex);
    
    // Extract soup
    const soupMatch = todaySection.match(/Polévka:\s*([^1-9]+?)(?=\s*1\.)/);
    if (soupMatch) {
      menuItems.push(`Polévka: ${soupMatch[1].trim()}`);
    }
    
    // Extract menu items 1-4
    for (let i = 1; i <= 4; i++) {
      const menuPattern = new RegExp(`${i}\\.\\s*([\\s\\S]*?)\\s*(\\d+\\s*Kč)\\s*Menu\\s*${i}`, 'i');
      const menuMatch = todaySection.match(menuPattern);
      if (menuMatch) {
        const dish = menuMatch[1].trim().replace(/\s+/g, ' ');
        const price = menuMatch[2].trim();
        menuItems.push(`${dish}\n${price}Menu ${i}`);
      }
    }
    
    // Extract dessert
    const dessertMatch = todaySection.match(/(Dort[^0-9]*?)(\d+\s*Kč)\s*Desert/i);
    if (dessertMatch) {
      menuItems.push(`${dessertMatch[1].trim()}\n${dessertMatch[2].trim()}Desert`);
    }
  }
  
  return menuItems;
}

async function scrapePlzenskyDvurMenu(html) {
  if (!html) return [];
  
  const $ = cheerio.load(html);
  const menuItems = [];
  
  // Get today's day name in Czech
  const today = new Date();
  const dayNames = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  const todayName = dayNames[today.getDay()];
  
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
        const nextMatch = pageText.substring(dayIndex + 10).match(nextPattern);
        if (nextMatch) {
          const nextIndex = dayIndex + 10 + pageText.substring(dayIndex + 10).indexOf(nextMatch[0]);
          if (nextIndex < endIndex) {
            endIndex = nextIndex;
          }
        }
      }
    }
    
    const todaySection = pageText.substring(dayIndex, endIndex);
    
    // Add the day header
    menuItems.push(dayMatch[0]);
    
    // Extract menu A
    const menuAMatch = todaySection.match(/A:\s*([^P]+?)(\d+\s*Kč)/);
    if (menuAMatch) {
      menuItems.push('A:');
      menuItems.push(`${menuAMatch[1].trim().replace(/\s+/g, ' ')}\n${menuAMatch[2]}`);
    }
    
    // Extract soup
    const soupMatch = todaySection.match(/Polévka:\s*([^B]+?)(?=\s*B:)/);
    if (soupMatch) {
      menuItems.push('Polévka:');
      menuItems.push(soupMatch[1].trim());
    }
    
    // Extract menu B
    const menuBMatch = todaySection.match(/B:\s*([^C]+?)(\d+\s*Kč)/);
    if (menuBMatch) {
      menuItems.push('B:');
      menuItems.push(`${menuBMatch[1].trim().replace(/\s+/g, ' ')}\n${menuBMatch[2]}`);
    }
    
    // Extract menu C
    const menuCMatch = todaySection.match(/C:\s*([^A-Z]+?)(\d+\s*Kč)/);
    if (menuCMatch) {
      menuItems.push('C:');
      menuItems.push(`${menuCMatch[1].trim().replace(/\s+/g, ' ')}\n${menuCMatch[2]}`);
    }
  }
  
  return menuItems;
}

async function scrapeLightOfIndiaMenu(html) {
  if (!html) return [];
  
  const $ = cheerio.load(html);
  const menuItems = [];
  
  // Get today's day name in Czech
  const today = new Date();
  const dayNames = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  const todayName = dayNames[today.getDay()];
  
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
  
  // Find today's section
  const dayIndex = pageText.indexOf(searchDay);
  if (dayIndex !== -1) {
    // Find the next day or end of content
    const nextDayNames = ['Uterý', 'Středa', 'Čtvrtek', 'Pátek', 'Obsažené'];
    let endIndex = pageText.length;
    
    for (const nextDay of nextDayNames) {
      if (nextDay !== searchDay) {
        const nextIndex = pageText.indexOf(nextDay, dayIndex + 1);
        if (nextIndex !== -1 && nextIndex < endIndex) {
          endIndex = nextIndex;
        }
      }
    }
    
    const todaySection = pageText.substring(dayIndex, endIndex);
    
    // Add day header
    menuItems.push(searchDay);
    
    // Extract numbered menu items - pattern: number. dish price (allergens)
    const menuPattern = /(\d+)\.\s*([^0-9]+?)(\d+Kč)\s*(\([^)]*\))?/g;
    let match;
    while ((match = menuPattern.exec(todaySection)) !== null) {
      const number = match[1];
      const dish = match[2].trim();
      const price = match[3];
      const allergens = match[4] || '';
      menuItems.push(`${number}. ${dish} ${price} ${allergens}`.trim());
    }
  }
  
  return menuItems;
}

async function scrapeAllMenus() {
  console.log('🍽️  Scraping daily menus...\n');
  
  const today = new Date().toLocaleDateString('cs-CZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  console.log(`📅 Today: ${today}\n`);
  
  for (const restaurant of restaurants) {
    console.log(`🏪 ${restaurant.name}`);
    console.log(`🔗 ${restaurant.url}`);
    
    try {
      const html = await fetchPage(restaurant.url);
      const menuItems = await restaurant.scraper(html);
      
      if (menuItems.length > 0) {
        console.log('📋 Menu:');
        menuItems.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item}`);
        });
      } else {
        console.log('❌ No menu items found (website might have changed structure)');
      }
    } catch (error) {
      console.log(`❌ Error scraping menu: ${error.message}`);
    }
    
    console.log('\n' + '─'.repeat(80) + '\n');
  }
}

// Run the script
scrapeAllMenus().catch(console.error);
