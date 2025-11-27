// src/pages/customer/CustomerDashboard.jsx
import React, { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { AppContext } from "../context/AppContext";

import banner1 from "../assets/banners/banner1.jpg";
import banner2 from "../assets/banners/banner2.jpg";
import banner3 from "../assets/banners/banner3.jpg";
import banner4 from "../assets/banners/banner4.jpg";
import banner5 from "../assets/banners/banner5.jpg";
import banner6 from "../assets/banners/banner6.jpg";
import banner7 from "../assets/banners/banner7.jpg";
import banner8 from "../assets/banners/banner8.jpg";
import banner9 from "../assets/banners/banner9.jpg";
import banner10 from "../assets/banners/banner10.jpg";

const topBanners = [banner1, banner2, banner3, banner4, banner5];
const bottomBanners = [banner6, banner7, banner8, banner9, banner10];

const CustomerDashboard = () => {
  const navigate = useNavigate();

  const { backendUrl, isLoggedIn, userData, setIsLoggedIn, setUserData } =
    useContext(AppContext);

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const profileRef = useRef();

  // fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // axios baseURL already set → just use path
        const { data } = await axios.get("/api/service-categories/active");
        setCategories(data.categories || data.data || []);
      } catch (err) {
        console.error("Fetch categories error:", err);
      }
    };
    fetchCategories();
  }, []);

  const fetchSubCategories = async (categoryId) => {
    try {
      const { data } = await axios.get(
        `/api/sub-service-categories?serviceCategoryId=${categoryId}`
      );
      setSubCategories(data.subCategories || data.data || []);
    } catch (err) {
      console.error("Fetch subcategories:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <div className="h-20" />

      {/* HERO */}
      <div className="flex-1 px-4">
        <div className="relative max-w-2xl mx-auto">
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full mb-5 bg-gray-100 rounded-full py-3 px-4 shadow-inner"
          />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4">
        <section>
          <Swiper
            modules={[Autoplay, Pagination, Navigation]}
            autoplay={{ delay: 4500 }}
            pagination={{ clickable: true }}
            navigation
            loop
            className="rounded-2xl overflow-hidden"
            style={{ height: 460 }}
          >
            {topBanners.map((src, i) => (
              <SwiperSlide key={i}>
                <div
                  className="w-full h-full bg-center bg-cover"
                  style={{ backgroundImage: `url(${src})` }}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </section>

        <div className="flex justify-center mt-6 text-gray-600">
          <MapPin className="text-sky-600" /> Surat, Gujarat
        </div>

        {/* Categories */}
        <section className="mt-10 bg-white rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-center mb-6">
            Popular Categories
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {categories.map((cat) => (
              <button
                key={cat._id}
                className="bg-white rounded-xl shadow-sm p-4"
              >
                <img
                  src={cat.image ? `${backendUrl}${cat.image}` : "/placeholder.png"}
                  className="w-20 h-20 object-cover rounded-full"
                />
                <div className="text-gray-800 mt-2">{cat.name}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Bottom banners */}
        <section className="mt-10">
          <Swiper modules={[Autoplay, Pagination]} autoplay={{ delay: 2800 }}>
            {bottomBanners.map((src, i) => (
              <SwiperSlide key={i}>
                <div
                  className="h-56 bg-cover bg-center rounded-xl"
                  style={{ backgroundImage: `url(${src})` }}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </section>

        <footer className="mt-12 p-6 text-center bg-white rounded-xl shadow">
          © {new Date().getFullYear()} Technosys
        </footer>
      </main>
    </div>
  );
};

export default CustomerDashboard;
