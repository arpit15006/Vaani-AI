async function getWeather({ city }) {
  try {
    if (!city) {
      return {
        success: false,
        error: "City name is required",
        fallback: "I need a city name to check the weather. Which city are you interested in?",
      };
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;

    // If no API key, return mock data
    if (!apiKey) {
      return getMockWeather(city);
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather API returned ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      message: `The weather in ${data.name} is currently ${data.weather[0].description} with a temperature of ${Math.round(data.main.temp)}°C. Humidity is ${data.main.humidity}% and wind speed is ${Math.round(data.wind.speed)} m/s.`,
      data: {
        city: data.name,
        temp: `${Math.round(data.main.temp)}°C`,
        description: data.weather[0].description,
        humidity: `${data.main.humidity}%`,
        wind: `${Math.round(data.wind.speed)} m/s`,
        icon: data.weather[0].icon,
        mock: false,
      },
    };
  } catch (error) {
    console.error("[Tool:Weather] Error:", error.message);
    // Fallback to mock
    return getMockWeather(city);
  }
}

function getMockWeather(city) {
  const conditions = [
    { desc: "partly cloudy", temp: 28, humidity: 65 },
    { desc: "sunny with clear skies", temp: 32, humidity: 45 },
    { desc: "light rain expected", temp: 24, humidity: 80 },
    { desc: "pleasant and breezy", temp: 26, humidity: 55 },
  ];
  const condition = conditions[Math.floor(Math.random() * conditions.length)];

  return {
    success: true,
    message: `The weather in ${city} is currently ${condition.desc} with a temperature of ${condition.temp}°C. Humidity is around ${condition.humidity}%.`,
    data: {
      city,
      temp: `${condition.temp}°C`,
      description: condition.desc,
      humidity: `${condition.humidity}%`,
      wind: "12 km/h",
      mock: true,
    },
  };
}

module.exports = { getWeather };
