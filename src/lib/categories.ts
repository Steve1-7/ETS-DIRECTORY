import {
  BriefcaseBusiness,
  Building2,
  CarFront,
  HeartPulse,
  House,
  Utensils,
} from "lucide-react";

export const categories = [
  {
    name: "Home & Garden",
    slug: "home-garden",
    Icon: House,
    description: "Find local home maintenance, repair, landscaping and gardening services.",
    tag: "Fresh spaces",
    gradient: "from-[#d7f7d5] via-[#a9e6b1] to-[#63c07a]",
    accent: "#166c45",
  },
  {
    name: "Food & Drink",
    slug: "food-drink",
    Icon: Utensils,
    description: "Discover restaurants, cafes, caterers and food businesses in your area.",
    tag: "Big flavour",
    gradient: "from-[#ffe7b9] via-[#ffc86d] to-[#f2a93b]",
    accent: "#7e4a00",
  },
  {
    name: "Professional",
    slug: "professional-services",
    Icon: BriefcaseBusiness,
    description: "Connect with legal, financial, consulting and other professional services.",
    tag: "Expert moves",
    gradient: "from-[#dfe9ff] via-[#a8befa] to-[#7287ef]",
    accent: "#243797",
  },
  {
    name: "Health & Wellness",
    slug: "health-wellness",
    Icon: HeartPulse,
    description: "Explore health practitioners, fitness providers and wellness services.",
    tag: "Feel good",
    gradient: "from-[#ffe1f0] via-[#ffb0d7] to-[#f970b3]",
    accent: "#7a174d",
  },
  {
    name: "Automotive",
    slug: "automotive",
    Icon: CarFront,
    description: "Find vehicle repairs, maintenance, sales and automotive services.",
    tag: "Built to move",
    gradient: "from-[#d9f1ff] via-[#8ed7ff] to-[#1fa6d8]",
    accent: "#0e5b7f",
  },
  {
    name: "Business Services",
    slug: "business-services",
    Icon: Building2,
    description: "Find services that help local businesses grow and operate.",
    tag: "Scale smart",
    gradient: "from-[#efe3ff] via-[#c9b5ff] to-[#915cf5]",
    accent: "#43217d",
  },
] as const;

export const popularLocations = [
  "Johannesburg",
  "Cape Town",
  "Durban",
  "Pretoria",
  "Gqeberha",
  "Stellenbosch",
] as const;
