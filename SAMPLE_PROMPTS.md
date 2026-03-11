# SCX.ai — Sample Prompts for Tool Testing

Use these prompts in the chat app to verify each tool is working correctly.
The model should call the listed tool automatically based on the prompt.

---

## 1. `web_search` — Live web search

```
What happened in Australian politics this week?
```
```
Latest news about AI regulation in Australia 2026
```
```
What is the current situation with the Australian housing market?
```

---

## 2. `retrieve` — Fetch and summarise a webpage

```
Summarise the content from this page: https://www.abc.net.au/news
```
```
What does this page say? https://www.southerncrossai.com.au
```

---

## 3. `extreme_search` — Deep multi-source research

```
Give me a comprehensive research report on Australia's sovereign AI strategy in 2026
```
```
Deep dive into the history and current state of quantum computing in Australia
```

---

## 4. `get_weather_data` — Current weather

```
What is the weather like in Sydney right now?
```
```
What's the forecast for Melbourne this week?
```
```
Is it raining in Brisbane today?
```

---

## 5. `datetime` — Current date and time

```
What is the current date and time in Melbourne?
```
```
What time is it in Perth right now?
```
```
What day of the week is it in Sydney?
```

---

## 6. `text_translate` — Language translation

```
Translate "Good morning, how are you today?" into French
```
```
Translate "The meeting is scheduled for tomorrow at 9am" into Japanese, Mandarin, and Spanish
```
```
How do you say "Thank you for your business" in Arabic?
```
```
Translate this into German: "Australia is a leading nation in sovereign AI infrastructure"
```

---

## 7. `currency_converter` — Currency conversion

```
How much is 500 Australian dollars in US dollars?
```
```
Convert 1000 USD to AUD, EUR, and GBP
```
```
What is 250 euros in Australian dollars today?
```

---

## 8. `stock_price` — Real-time stock prices

```
What is the current stock price of Tesla?
```
```
What is Apple's share price right now?
```
```
Show me the current price of BHP on the ASX
```
```
What is NVIDIA's stock trading at today?
```

---

## 9. `nearby_places_search` — Find nearby businesses

```
Find coffee shops near Sydney Opera House
```
```
What are the best restaurants near Melbourne CBD?
```
```
Find petrol stations near Canberra city centre
```
```
Are there any pharmacies near Martin Place, Sydney?
```

---

## 10. `find_place_on_map` — Show a location on a map

```
Show me where Parliament House in Canberra is on the map
```
```
Where is the Sydney Harbour Bridge?
```
```
Find the location of Melbourne Airport on the map
```

---

## 11. `trending_movies` — What's popular at the cinema

```
What are the most popular movies right now?
```
```
What films are trending this week?
```
```
What movies should I watch this weekend?
```

---

## 12. `trending_tv` — What's popular on TV / streaming

```
What TV shows are trending this week?
```
```
What are the most popular series to watch right now?
```
```
What's everyone watching on streaming this week?
```

---

## 13. `movie_or_tv_search` — Look up a specific film or series

```
Tell me about the movie Dune Part Two — cast, rating, and plot
```
```
What are the details for the TV show Severance?
```
```
Who stars in Oppenheimer and what is it rated?
```

---

## 14. `generate_document` — Generate a downloadable PDF/document

```
Generate a PDF report about the history of artificial intelligence
```
```
Create a document summarising the key benefits of sovereign AI for Australian enterprises
```
```
Write a one-page executive summary on cloud computing trends in 2026 and export it as a PDF
```

---

## 15. `code_interpreter` — Run and execute code

```
Write and run a Python script that calculates the first 20 Fibonacci numbers
```
```
Run Python code to calculate compound interest on $10,000 at 5% per year for 10 years
```
```
Write a Python function that sorts a list of names alphabetically and run it with example data
```

---

## Multi-tool / Combined prompts

These prompts should trigger multiple tools or test routing accuracy:

```
What is the weather in Sydney and convert 100 AUD to USD?
```
```
What are Tesla's current stock price and what trending movies are out this week?
```
```
Translate "The stock market is down today" into French and Japanese
```
```
What time is it in Tokyo right now and what is the exchange rate from JPY to AUD?
```

---

## Prompts that should NOT trigger tools

These should be answered directly from the model's knowledge (no tool call):

```
What is the capital of Australia?
```
```
Explain what machine learning is in simple terms
```
```
Write me a haiku about the Sydney Harbour
```
```
What is 2 + 2?
```
```
What are the three branches of government?
```
