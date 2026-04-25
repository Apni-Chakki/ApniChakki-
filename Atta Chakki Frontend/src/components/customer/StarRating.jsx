import { Rating } from 'react-simple-star-rating';
import { useState } from 'react';

export function StarRating({ rating, interactive = false, onRatingChange = () => {} }) {
  return (
    <Rating
      initialValue={rating}
      readonly={!interactive}
      onClick={onRatingChange}
      size={24}
      fillColor="var(--primary)"
      emptyColor="#d9cfc1"
      transition
      allowFraction={false}
      SVGstyle={{ display: 'inline', transition: 'transform 0.2s ease-in-out' }}
      className={interactive ? "hover:scale-105 cursor-pointer" : ""}
    />
  );
}