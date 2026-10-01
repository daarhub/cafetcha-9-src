import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./Menu.css";

const menuCategories = [
  {
    id: 1,
    name: "COFFEE",
    description:
      "Warm, comforting drinks freshly brewed to brighten your day and make every moment perfect.",
    image: "/images/coffee.png",
    link: "/menu?category=Coffee",
  },
  {
    id: 2,
    name: "NON-COFFEE",
    description:
      "Refreshing drinks and creamy favorites made for every kind of craving.",
    image: "/images/noncoffee.png",
    link: "/menu?category=Non-Coffee",
  },
  {
    id: 3,
    name: "FOOD",
    description:
      "Delicious meals and savory bites prepared to perfectly pair with your favorite drink.",
    image: "/images/food.png",
    link: "/menu?category=Food",
  },
  {
    id: 4,
    name: "DESSERTS",
    description: "Sweet treats made to complete your Cafétcha experience.",
    image: "/images/desserts.png",
    link: "/menu?category=Desserts",
  },
];

function Menu() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

   // Detect when menu section scrolls into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // only animate in once
        }
      },
      { threshold: 0.25 } // fires when 25% of section is visible
    );

    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, []);

  // Automatic slide every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) =>
        prev === menuCategories.length - 1 ? 0 : prev + 1,
      );
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const previousSlide = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? menuCategories.length - 1 : prev - 1,
    );
  };

  const nextSlide = () => {
    setCurrentIndex((prev) =>
      prev === menuCategories.length - 1 ? 0 : prev + 1,
    );
  };

  const currentItem = menuCategories[currentIndex];

  return (
    <section
      className={`menu ${isVisible ? "menu-in-view" : ""}`}
      id="menu"
      ref={sectionRef}
    >
      {/* =========================
          BACKGROUND
      ========================= */}

      <img src="/images/menu-bg.png" alt="" className="menu-bg" />

      {/* =========================
          BACKGROUND ELEMENTS
      ========================= */}

      <img src="/images/coffee-bean1.png" alt="" className="menu-element menu-element-5" />
      <img src="/images/coffee-bean2.png" alt="" className="menu-element menu-element-6" />
      <img src="/images/menu-element1.png" alt="" className="menu-element menu-element-1" />
      <img src="/images/menu-element2.png" alt="" className="menu-element menu-element-2" />
      <img src="/images/menu-element3.png" alt="" className="menu-element menu-element-3" />
      <img src="/images/menu-element4.png" alt="" className="menu-element menu-element-4" />
      
      {/* =========================
          MENU CONTENT
      ========================= */}

      <div className="menu-content">
        {/* TITLE */}

        <div className="menu-title">
          <span className="menu-title-star">✦</span>

          <h2>CAFÉTCHA MENU</h2>

          <span className="menu-title-star">✦</span>
        </div>

        {/* =========================
            SLIDER
        ========================= */}

        <div className="menu-slider">
          {/* =========================
              BROWN CARD
          ========================= */}

          <div className="menu-card">
            {/* PREVIOUS BUTTON */}

            <button
              className="menu-arrow menu-arrow-left"
              onClick={previousSlide}
              aria-label="Previous menu"
            >
              <ChevronLeft size={30} strokeWidth={1.8} />
            </button>

            {/* FOOD IMAGE */}

            <div className="menu-food">
              <img
                key={currentItem.image}
                src={currentItem.image}
                alt={currentItem.name}
              />
            </div>

            {/* MENU INFORMATION */}

            <div className="menu-info">
              <h3>{currentItem.name}</h3>

              <p>{currentItem.description}</p>
            </div>

            {/* EXPLORE BUTTON */}

            <a href={currentItem.link} className="menu-explore">
              EXPLORE MORE
            </a>

            {/* NEXT BUTTON */}

            <button
              className="menu-arrow menu-arrow-right"
              onClick={nextSlide}
              aria-label="Next menu"
            >
              <ChevronRight size={30} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* =========================
            DOTS
        ========================= */}

        <div className="menu-dots">
          {menuCategories.map((item, index) => (
            <button
              key={item.id}
              className={
                index === currentIndex ? "menu-dot active" : "menu-dot"
              }
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to ${item.name}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Menu;
