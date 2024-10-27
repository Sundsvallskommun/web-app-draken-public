// A react component using the intersection observer api to detect when an element is visible in the viewport
// https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API

import React, { useEffect, useRef, useState } from 'react';
export const useIntersectionObserver = (options) => {
  const [isIntersecting, setIntersecting] = useState(false);
  const [node, setNode] = useState(null);
  const observer = useRef(null);
  useEffect(() => {
    if (node) {
      observer.current = new IntersectionObserver(([entry]) => {
        setIntersecting(entry.isIntersecting);
      }, options);
      observer.current.observe(node);
    }
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [node, options]);
  return [setNode, isIntersecting];
};

const IntersectionObserverComponent = ({ children, ...options }) => {
  const [setNode, isIntersecting] = useIntersectionObserver(options);
  return children({
    ref: setNode,
    isIntersecting,
  });
};

export default IntersectionObserverComponent;
