import { Rating } from 'react-simple-star-rating';

export function RollingStarRating({ 
  rating, 
  interactive = false, 
  onRatingChange = () => {} 
}) {
  return (
    <Rating
      initialValue={rating}
      readonly={!interactive}
      onClick={onRatingChange}
      size={24}
      fillColor="#FFD700"
      emptyColor="#d9cfc1"
      transition
      allowFraction={false}
      SVGstyle={{ display: 'inline' }}
      className={interactive ? "cursor-pointer" : ""}
    />
  );
}