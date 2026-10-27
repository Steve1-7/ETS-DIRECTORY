import {
  BriefcaseBusiness,
  Building2,
  CarFront,
  HeartPulse,
  House,
  Utensils,
} from "lucide-react";

export const categories = [
  { name: "Home & Garden", slug: "home-garden", Icon: House, description: "Find local home maintenance, repair, landscaping and gardening services." },
  { name: "Food & Drink", slug: "food-drink", Icon: Utensils, description: "Discover restaurants, cafes, caterers and food businesses in your area." },
  { name: "Professional", slug: "professional-services", Icon: BriefcaseBusiness, description: "Connect with legal, financial, consulting and other professional services." },
  { name: "Health & Wellness", slug: "health-wellness", Icon: HeartPulse, description: "Explore health practitioners, fitness providers and wellness services." },
  { name: "Automotive", slug: "automotive", Icon: CarFront, description: "Find vehicle repairs, maintenance, sales and automotive services." },
  { name: "Business Services", slug: "business-services", Icon: Building2, description: "Find services that help local businesses grow and operate." },
] as const;

export const popularLocations = [
  "Johannesburg",
  "Cape Town",
  "Durban",
  "Pretoria",
  "Gqeberha",
  "Stellenbosch",
] as const;
