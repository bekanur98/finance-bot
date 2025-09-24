import axios from "axios";
import * as cheerio from "cheerio";

async function testNewParser() {
  try {
    console.log("Fetching data from nbkr.kg currency page...");
    const response = await axios.get("https://www.nbkr.kg/index1.jsp?item=1562&lang=RUS");

    console.log("Response status:", response.status);
    console.log("Response length:", response.data.length);

    const $ = cheerio.load(response.data);

    // Ищем таблицы на странице
    console.log("\n=== All tables on page ===");
    $("table").each((i, table) => {
      console.log(`Table ${i + 1}:`, $(table).attr("class") || "no class");
      console.log("Table content preview:", $(table).text().substring(0, 200) + "...");
    });

    // Ищем интересующие нас валюты
    const currencies = ["рубль", "доллар", "евро", "тенге", "юань", "лира", "USD", "EUR", "RUB", "KZT", "CNY", "TRY"];
    console.log("\n=== Looking for specific currencies ===");

    currencies.forEach(currency => {
      const elements = $(`*:contains("${currency}")`);
      if (elements.length > 0) {
        console.log(`${currency} found in ${elements.length} elements`);
      }
    });

    // Проверяем таблицы с курсами
    console.log("\n=== Table rows containing currency data ===");
    $("table tr").each((i, row) => {
      const text = $(row).text();
      if (text.includes("доллар") || text.includes("рубль") || text.includes("евро") ||
          text.includes("тенге") || text.includes("юань") || text.includes("лира")) {
        const cells = $(row).find("td, th").map((j, cell) => $(cell).text().trim()).get();
        console.log(`Row ${i + 1}:`, cells);
      }
    });

  } catch (error) {
    console.error("Error:", error.message);
  }
}

testNewParser();
