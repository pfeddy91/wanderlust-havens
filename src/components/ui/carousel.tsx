"use client";
import { IconArrowNarrowRight } from "@tabler/icons-react";
import { useState, useRef, useId, useEffect } from "react";

interface SlideData {
  title: string;
  button: string;
  src: string;
  onButtonClick?: () => void;
  onSlideNavigate?: () => void;
}

interface SlideProps {
  slide: SlideData;
  index: number;
  current: number;
  handleSlideClick: (index: number) => void;
}

const Slide = ({ slide, index, current, handleSlideClick }: SlideProps) => {
  const slideRef = useRef<HTMLLIElement>(null);

  const xRef = useRef(0);
  const yRef = useRef(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const animate = () => {
      if (!slideRef.current) return;

      const x = xRef.current;
      const y = yRef.current;

      slideRef.current.style.setProperty("--x", `${x}px`);
      slideRef.current.style.setProperty("--y", `${y}px`);

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const handleMouseMove = (event: React.MouseEvent) => {
    const el = slideRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    xRef.current = event.clientX - (r.left + Math.floor(r.width / 2));
    yRef.current = event.clientY - (r.top + Math.floor(r.height / 2));
  };

  const handleMouseLeave = () => {
    xRef.current = 0;
    yRef.current = 0;
  };

  const imageLoaded = (event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.style.opacity = "1";
  };

  const { src, button, title, onButtonClick, onSlideNavigate } = slide;

  return (
    <div className="[perspective:1200px] [transform-style:preserve-3d]">
      <li
        ref={slideRef}
        className="flex flex-1 flex-col items-center justify-center relative text-center text-white opacity-100 transition-all duration-300 ease-in-out w-[56vmin] h-[56vmin] mx-[4vmin] z-10 cursor-pointer"
        onClick={() => {
          handleSlideClick(index);
          if (onSlideNavigate) {
            onSlideNavigate();
          }
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: "scale(1) rotateX(0deg)",
          transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          transformOrigin: "bottom",
        }}
      >
        <div
          className="absolute top-0 left-0 w-full h-full bg-[#1D1F2F] rounded-xl overflow-hidden transition-all duration-150 ease-out"
          style={{
            transform:
              current === index
                ? "translate3d(calc(var(--x) / 30), calc(var(--y) / 30), 0)"
                : "none",
          }}
        >
          <img
            className="absolute inset-0 w-[120%] h-[120%] object-cover opacity-100 transition-opacity duration-600 ease-in-out"
            style={{
              opacity: current === index ? 1 : 0.5,
            }}
            alt={title}
            src={src}
            onLoad={imageLoaded}
            loading="eager"
            decoding="sync"
          />
          {current === index && (
            <div className="absolute inset-0 bg-black/30 transition-all duration-1000" />
          )}
        </div>

        <article
          className={`relative p-[4vmin] transition-opacity duration-1000 ease-in-out ${
            current === index ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
        >
          <h2 className="text-lg md:text-2xl lg:text-4xl font-semibold  relative">
            {title}
          </h2>
          <div className="flex justify-center">
            <button
              className="mt-6  px-4 py-2 w-fit mx-auto sm:text-sm text-black bg-white h-12 border border-transparent text-xs flex justify-center items-center rounded-2xl hover:shadow-lg transition duration-200 shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)]"
              onClick={(e) => {
                e.stopPropagation();
                if (onButtonClick) {
                  onButtonClick();
                } else if (onSlideNavigate) {
                  onSlideNavigate();
                }
              }}
            >
              {button}
            </button>
          </div>
        </article>
      </li>
    </div>
  );
};

interface CarouselControlProps {
  type: string;
  title: string;
  handleClick: () => void;
}

const CarouselControl = ({
  type,
  title,
  handleClick,
}: CarouselControlProps) => {
  return (
    <button
      className={`w-10 h-10 flex items-center mx-2 justify-center bg-black border-transparent rounded-full focus:border-blue-500 focus:outline-none hover:opacity-80 active:opacity-90 transition duration-200 ${
        type === "previous" ? "rotate-180" : ""
      }`}
      title={title}
      onClick={handleClick}
    >
      <IconArrowNarrowRight className="text-white" />
    </button>
  );
};

interface CarouselProps {
  slides: SlideData[];
  startIndex?: number;
}

export function Carousel({ slides: originalSlides, startIndex = 1 }: CarouselProps) {
  const [current, setCurrent] = useState(startIndex);
  const carouselListRef = useRef<HTMLUListElement>(null);
  const transitionDuration = 500; // ms

  useEffect(() => {
    // Validate the start index
    const validStartIndex = 
      startIndex >= 0 && startIndex < originalSlides.length ? startIndex : 1;
    setCurrent(validStartIndex);
  }, [originalSlides, startIndex]);

  const handlePreviousClick = () => {
    setCurrent((prev) => Math.max(0, prev - 1));
  };

  const handleNextClick = () => {
    setCurrent((prev) => Math.min(originalSlides.length - 1, prev + 1));
  };

  const handleSlideClick = (index: number) => {
    if (current === index) return;
    setCurrent(index);
  };

  const id = useId();

  if (!originalSlides || originalSlides.length < 1) {
    return null; // Return nothing if there are no slides
  }

  // If there's only one slide, no need for controls
  if (originalSlides.length === 1) {
    return (
      <div className="relative w-[56vmin] h-[56vmin] mx-auto">
        <ul>
          <Slide
            key={0}
            slide={originalSlides[0]}
            index={0}
            current={0}
            handleSlideClick={() => {}}
          />
        </ul>
      </div>
    )
  }

  // Calculate the slide width including margins (56vmin + 8vmin margins)
  const slideWidth = 64; // 56vmin + 4vmin margin on each side

  return (
    <div
      className="relative w-[56vmin] h-[56vmin] mx-auto"
      aria-labelledby={`carousel-heading-${id}`}
    >
      <ul
        ref={carouselListRef}
        className="absolute flex mx-[-4vmin]"
        style={{
          transform: `translateX(-${current * slideWidth}vmin)`,
          transition: `transform ${transitionDuration}ms ease-in-out`,
        }}
      >
        {originalSlides.map((slide, index) => (
          <Slide
            key={index}
            slide={slide}
            index={index}
            current={current}
            handleSlideClick={handleSlideClick}
          />
        ))}
      </ul>

      <div className="absolute flex justify-center w-full top-[calc(100%+1rem)]">
        <CarouselControl
          type="previous"
          title="Go to previous slide"
          handleClick={handlePreviousClick}
        />

        <CarouselControl
          type="next"
          title="Go to next slide"
          handleClick={handleNextClick}
        />
      </div>
    </div>
  );
}
