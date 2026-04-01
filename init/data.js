const categoriesData = [
  { name: "Burrito Bowls", slug: "burrito-bowls", imageUrl: "https://s3-ap-southeast-1.amazonaws.com/foodvista.1/3e01f3e5-cc79-4a33-8ab7-3ebac3b92fb3.jpg" },
  { name: "Asian Bowls", slug: "asian-bowls", imageUrl: "https://s3-ap-southeast-1.amazonaws.com/foodvista.1/3e01f3e5-cc79-4a33-8ab7-3ebac3b92fb3.jpg" },
  { name: "Continental Bowls", slug: "continental-bowls", imageUrl: "https://s3-ap-southeast-1.amazonaws.com/foodvista.1/3e01f3e5-cc79-4a33-8ab7-3ebac3b92fb3.jpg" },
  { name: "Korean Bowls", slug: "korean-bowls", imageUrl: "https://s3-ap-southeast-1.amazonaws.com/foodvista.1/3e01f3e5-cc79-4a33-8ab7-3ebac3b92fb3.jpg" },
  { name: "Indian Meals", slug: "indian-meals", imageUrl: "https://s3-ap-southeast-1.amazonaws.com/foodvista.1/3e01f3e5-cc79-4a33-8ab7-3ebac3b92fb3.jpg" },
  { name: "Pastas", slug: "pastas", imageUrl: "https://s3-ap-southeast-1.amazonaws.com/foodvista.1/3e01f3e5-cc79-4a33-8ab7-3ebac3b92fb3.jpg" },
  { name: "Healthy Salads", slug: "healthy-salads", imageUrl: "https://s3-ap-southeast-1.amazonaws.com/foodvista.1/3e01f3e5-cc79-4a33-8ab7-3ebac3b92fb3.jpg" },
  { name: "Desserts", slug: "desserts", imageUrl: "https://s3-ap-southeast-1.amazonaws.com/foodvista.1/3e01f3e5-cc79-4a33-8ab7-3ebac3b92fb3.jpg" }
];

const restaurantData = [
  {
    name: "The Food Truck",
    description: "Delicious bowls and meals from around the world",
    address: {
      street: "123 Main Street",
      city: "Delhi",
      state: "Delhi",
      pincode: "110001",
      coordinates: {
        latitude: 28.6139,
        longitude: 77.2090
      }
    },
    phone: "+91-9876543210",
    email: "info@thefoodtruck.com",
    operatingHours: {
      monday: { open: "10:00", close: "22:00" },
      tuesday: { open: "10:00", close: "22:00" },
      wednesday: { open: "10:00", close: "22:00" },
      thursday: { open: "10:00", close: "22:00" },
      friday: { open: "10:00", close: "22:00" },
      saturday: { open: "10:00", close: "22:00" },
      sunday: { open: "10:00", close: "22:00" }
    },
    cuisine: ["Mexican", "Asian", "Continental", "Korean", "Indian", "Italian"],
    imageUrl: "https://s3-ap-southeast-1.amazonaws.com/foodvista.1/3e01f3e5-cc79-4a33-8ab7-3ebac3b92fb3.jpg",
    deliveryRadius: 15,
    deliveryFee: 50,
    minimumOrder: 100
  }
];

const menuData = [
  {
    title: "Smoky Chipotle Burrito Bowl",
    categoryName: "Burrito Bowls",
    foodType: "veg",
    description: "Rice bowl with chipotle veggies and grilled paneer",
    price: 149,
    originalPrice: 299,
    calories: 310,
    imageUrl: "https://s3-ap-southeast-1.amazonaws.com/foodvista.1/3e01f3e5-cc79-4a33-8ab7-3ebac3b92fb3.jpg",
    tags: ["Mexican"],
    customizable: true
  },
  {
    title: "Teriyaki Tofu Asian Bowl",
    categoryName: "Asian Bowls",
    foodType: "veg",
    description: "Sweet teriyaki tofu with stir-fried rice",
    price: 179,
    originalPrice: 329,
    calories: 280,
    imageUrl: "https://s3-ap-southeast-1.amazonaws.com/foodvista.1/3e01f3e5-cc79-4a33-8ab7-3ebac3b92fb3.jpg",
    tags: ["Asian"],
    customizable: true
  },
  {
    title: "Grilled Chicken Continental Bowl",
    categoryName: "Continental Bowls",
    foodType: "non-veg",
    description: "Herb grilled chicken with mashed potatoes",
    price: 229,
    originalPrice: 399,
    calories: 420,
    imageUrl: "https://s3-ap-southeast-1.amazonaws.com/foodvista.1/3e01f3e5-cc79-4a33-8ab7-3ebac3b92fb3.jpg",
    tags: ["Continental"],
    customizable: false
  },
  {
    title: "Spicy Korean BBQ Chicken Bowl",
    categoryName: "Korean Bowls",
    foodType: "non-veg",
    description: "Korean BBQ chicken with kimchi rice",
    price: 199,
    originalPrice: 349,
    calories: 360,
    imageUrl: "https://s3-ap-southeast-1.amazonaws.com/foodvista.1/3e01f3e5-cc79-4a33-8ab7-3ebac3b92fb3.jpg",
    tags: ["Korean"],
    customizable: false
  },
  {
    title: "Classic Paneer Butter Meal",
    categoryName: "Indian Meals",
    foodType: "veg",
    description: "Paneer butter masala with jeera rice",
    price: 159,
    originalPrice: 299,
    calories: 390,
    imageUrl: "https://s3-ap-southeast-1.amazonaws.com/foodvista.1/3e01f3e5-cc79-4a33-8ab7-3ebac3b92fb3.jpg",
    tags: ["Indian"],
    customizable: true
  },
  {
    title: "Creamy Alfredo Pasta",
    categoryName: "Pastas",
    foodType: "veg",
    description: "Penne pasta in rich Alfredo sauce",
    price: 189,
    originalPrice: 329,
    calories: 450,
    imageUrl: "https://s3-ap-southeast-1.amazonaws.com/foodvista.1/3e01f3e5-cc79-4a33-8ab7-3ebac3b92fb3.jpg",
    tags: ["Italian"],
    customizable: true
  },
  {
    title: "Fresh Garden Veg Salad",
    categoryName: "Healthy Salads",
    foodType: "veg",
    description: "Crisp veggies tossed in lemon dressing",
    price: 129,
    originalPrice: 249,
    calories: 180,
    imageUrl: "https://s3-ap-southeast-1.amazonaws.com/foodvista.1/3e01f3e5-cc79-4a33-8ab7-3ebac3b92fb3.jpg",
    tags: ["Healthy"],
    customizable: false
  },
  {
    title: "Chocolate Lava Dessert Bowl",
    categoryName: "Desserts",
    foodType: "veg",
    description: "Warm chocolate lava cake with syrup",
    price: 99,
    originalPrice: 199,
    calories: 320,
    imageUrl: "https://s3-ap-southeast-1.amazonaws.com/foodvista.1/3e01f3e5-cc79-4a33-8ab7-3ebac3b92fb3.jpg",
    tags: ["Sweet"],
    customizable: false
  }
];

module.exports = { categoriesData, restaurantData, menuData };
