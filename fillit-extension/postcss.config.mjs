import remToPx from 'postcss-rem-to-responsive-pixel';

// Tailwind's rem units otherwise inherit the host page's html font size even
// inside a Shadow Root. Convert them using a stable 16px design baseline.
export default {
  plugins: [
    remToPx({
      rootValue: 16,
      propList: ['*'],
      transformUnit: 'px',
    }),
  ],
};
