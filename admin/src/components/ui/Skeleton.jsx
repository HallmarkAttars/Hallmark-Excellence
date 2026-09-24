import React, { useState } from 'react'
import { PRODUCT_IMAGE_PLACEHOLDER, handleProductImageError } from '../../utils/productImage'
import './Skeleton.css'

/**
 * Base atomic Skeleton component with shimmering animation.
 */
export function Skeleton({
  width = '100%',
  height = '14px',
  radius,
  circle = false,
  pill = false,
  className = '',
  style = {},
  ...props
}) {
  const customStyle = {
    width,
    height,
    ...(radius ? { borderRadius: radius } : {}),
    ...style,
  }

  const classes = [
    'skeleton-shimmer',
    circle ? 'skeleton-circle' : '',
    pill ? 'skeleton-pill' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <span className={classes} style={customStyle} aria-hidden="true" {...props} />
}

/**
 * Image component that renders a skeleton shimmer while loading,
 * gracefully switches to the image on load, and falls back to placeholder on error.
 */
export function ImageWithSkeleton({
  src,
  alt = '',
  width = 44,
  height = 44,
  radius = 4,
  className = '',
  imgClassName = '',
  style = {},
  fallbackSrc = PRODUCT_IMAGE_PLACEHOLDER,
  ...props
}) {
  const [loaded, setLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const finalSrc = hasError || !src ? fallbackSrc : src

  return (
    <div
      className={`image-skeleton-wrapper ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof radius === 'number' ? `${radius}px` : radius,
        ...style,
      }}
    >
      {!loaded && (
        <Skeleton
          width="100%"
          height="100%"
          radius={radius}
          className="image-skeleton-placeholder"
        />
      )}
      <img
        src={finalSrc}
        alt={alt}
        className={`${imgClassName} ${loaded ? 'is-loaded' : 'is-loading'}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          borderRadius: typeof radius === 'number' ? `${radius}px` : radius,
        }}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          setHasError(true)
          setLoaded(true)
          handleProductImageError(e)
        }}
        loading="lazy"
        {...props}
      />
    </div>
  )
}

/**
 * Desktop Products table row skeleton (8 columns matching real table).
 */
export function ProductRowSkeleton({ count = 10 }) {
  return Array.from({ length: count }, (_, idx) => (
    <tr key={`sk-prod-row-${idx}`} className="skeleton-row" aria-hidden="true">
      {/* 1. Image */}
      <td>
        <Skeleton width="44px" height="44px" radius="4px" />
      </td>
      {/* 2. Pos */}
      <td className="products-pos">
        <Skeleton width="22px" height="14px" />
      </td>
      {/* 3. Name */}
      <td className="products-name">
        <div className="skeleton-cell-flex">
          <Skeleton width={idx % 2 === 0 ? '160px' : '210px'} height="16px" />
          {idx % 3 === 0 && <Skeleton width="55px" height="18px" pill />}
        </div>
      </td>
      {/* 4. Category */}
      <td>
        <Skeleton width={idx % 2 === 0 ? '80px' : '100px'} height="14px" />
      </td>
      {/* 5. Price */}
      <td>
        <Skeleton width="75px" height="15px" />
      </td>
      {/* 6. Stock */}
      <td>
        <Skeleton width="70px" height="24px" pill />
      </td>
      {/* 7. Status */}
      <td>
        <Skeleton width="64px" height="28px" pill />
      </td>
      {/* 8. Actions */}
      <td className="products-actions">
        <div className="skeleton-cell-flex">
          <Skeleton width="48px" height="30px" radius="var(--radius)" />
          <Skeleton width="56px" height="30px" radius="var(--radius)" />
        </div>
      </td>
    </tr>
  ))
}

/**
 * Mobile Product Card skeleton matching .product-card-mobile below 768px.
 */
export function ProductCardSkeleton({ count = 6 }) {
  return Array.from({ length: count }, (_, idx) => (
    <div key={`sk-prod-card-${idx}`} className="product-card-skeleton" aria-hidden="true">
      <div className="product-card-skeleton-top">
        <Skeleton width="72px" height="72px" radius="4px" />
        <div className="product-card-skeleton-info">
          <Skeleton width={idx % 2 === 0 ? '80%' : '65%'} height="16px" />
          <Skeleton width="40%" height="13px" />
          <Skeleton width="50%" height="15px" />
        </div>
      </div>
      <div className="product-card-skeleton-stock">
        <Skeleton width="70px" height="22px" pill />
        <Skeleton width="60px" height="26px" pill />
      </div>
      <div className="product-card-skeleton-actions">
        <Skeleton height="36px" radius="var(--radius)" />
        <Skeleton height="36px" radius="var(--radius)" />
      </div>
    </div>
  ))
}

/**
 * Desktop Orders table row skeleton (9 columns matching real table).
 */
export function OrderRowSkeleton({ count = 10 }) {
  return Array.from({ length: count }, (_, idx) => (
    <tr key={`sk-ord-row-${idx}`} className="skeleton-row" aria-hidden="true">
      {/* 1. Checkbox */}
      <td className="orders-select-cell">
        <Skeleton width="18px" height="18px" radius="3px" />
      </td>
      {/* 2. Expand */}
      <td className="orders-expand-cell">
        <Skeleton width="22px" height="22px" circle />
      </td>
      {/* 3. Order # */}
      <td className="orders-order-number">
        <Skeleton width="90px" height="15px" />
      </td>
      {/* 4. Customer */}
      <td className="orders-customer">
        <div className="skeleton-cell-stack">
          <Skeleton width={idx % 2 === 0 ? '110px' : '135px'} height="15px" />
          <Skeleton width="85px" height="12px" />
        </div>
      </td>
      {/* 5. Date */}
      <td className="orders-date">
        <div className="skeleton-cell-stack">
          <Skeleton width="80px" height="14px" />
          <Skeleton width="50px" height="12px" />
        </div>
      </td>
      {/* 6. Amount */}
      <td className="orders-amount">
        <Skeleton width="68px" height="16px" />
      </td>
      {/* 7. Payment */}
      <td className="orders-payment-cell">
        <div className="skeleton-cell-stack">
          <Skeleton width="54px" height="20px" pill />
          <Skeleton width="48px" height="18px" pill />
        </div>
      </td>
      {/* 8. Status */}
      <td>
        <Skeleton width="96px" height="34px" pill />
      </td>
      {/* 9. Actions */}
      <td className="orders-actions-cell">
        <div className="skeleton-cell-flex">
          <Skeleton width="34px" height="34px" radius="var(--radius)" />
          <Skeleton width="34px" height="34px" radius="var(--radius)" />
          <Skeleton width="62px" height="34px" radius="var(--radius)" />
        </div>
      </td>
    </tr>
  ))
}

/**
 * Mobile Order Card skeleton matching .order-card below 768px.
 */
export function OrderCardSkeleton({ count = 6 }) {
  return Array.from({ length: count }, (_, idx) => (
    <div key={`sk-ord-card-${idx}`} className="order-card-skeleton" aria-hidden="true">
      <div className="order-card-skeleton-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Skeleton width="18px" height="18px" radius="3px" />
          <Skeleton width="95px" height="16px" />
        </div>
        <Skeleton width="75px" height="24px" pill />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Skeleton width={idx % 2 === 0 ? '140px' : '170px'} height="15px" />
        <Skeleton width="90px" height="12px" />
      </div>
      <div className="order-card-skeleton-bottom">
        <Skeleton width="70px" height="16px" />
        <Skeleton width="80px" height="20px" pill />
        <Skeleton width="50px" height="26px" radius="var(--radius)" />
      </div>
    </div>
  ))
}

/**
 * Order Detail panel skeleton for expanded order row or modal.
 */
export function OrderDetailSkeleton() {
  return (
    <div className="order-detail-skeleton" aria-hidden="true">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skeleton width="90px" height="14px" />
          <Skeleton width="150px" height="16px" />
          <Skeleton width="120px" height="13px" />
          <Skeleton width="180px" height="13px" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skeleton width="80px" height="14px" />
          <Skeleton width="100px" height="15px" />
          <Skeleton width="70px" height="20px" pill />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
        <Skeleton width="100px" height="14px" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Skeleton width="48px" height="48px" radius="4px" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Skeleton width="60%" height="15px" />
            <Skeleton width="30%" height="12px" />
          </div>
          <Skeleton width="70px" height="16px" />
        </div>
      </div>
    </div>
  )
}

/**
 * Product Form / Detail Skeleton when loading product to edit.
 */
export function ProductDetailSkeleton() {
  return (
    <div className="product-form-skeleton" aria-hidden="true">
      <div className="form-skeleton-section">
        <Skeleton width="160px" height="20px" />
        <div className="form-skeleton-grid-2">
          <div className="form-skeleton-field">
            <Skeleton width="90px" height="13px" />
            <Skeleton height="44px" radius="var(--radius)" />
          </div>
          <div className="form-skeleton-field">
            <Skeleton width="75px" height="13px" />
            <Skeleton height="44px" radius="var(--radius)" />
          </div>
        </div>
        <div className="form-skeleton-field">
          <Skeleton width="100px" height="13px" />
          <Skeleton height="80px" radius="var(--radius)" />
        </div>
      </div>

      <div className="form-skeleton-section">
        <Skeleton width="130px" height="20px" />
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Skeleton width="120px" height="120px" radius="6px" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Skeleton width="180px" height="14px" />
            <Skeleton width="140px" height="12px" />
            <Skeleton width="110px" height="34px" radius="var(--radius)" />
          </div>
        </div>
      </div>

      <div className="form-skeleton-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton width="140px" height="20px" />
          <Skeleton width="110px" height="34px" radius="var(--radius)" />
        </div>
        <Skeleton height="64px" radius="var(--radius)" />
        <Skeleton height="64px" radius="var(--radius)" />
      </div>
    </div>
  )
}

/**
 * Category Grid Skeleton.
 */
export function CategoryGridSkeleton({ count = 6 }) {
  return (
    <div className="categories-admin-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, idx) => (
        <div key={`sk-cat-card-${idx}`} className="category-card-skeleton">
          <Skeleton width="70px" height="70px" circle />
          <Skeleton width={idx % 2 === 0 ? '110px' : '140px'} height="18px" />
          <Skeleton width="70px" height="13px" />
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <Skeleton width="50px" height="30px" radius="var(--radius)" />
            <Skeleton width="56px" height="30px" radius="var(--radius)" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Brand Grid Skeleton.
 */
export function BrandGridSkeleton({ count = 5 }) {
  return (
    <div className="brands-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, idx) => (
        <div key={`sk-brand-card-${idx}`} className="brand-card-skeleton">
          <div className="brand-card-skeleton-media">
            <Skeleton width="100%" height="100%" radius="0" />
          </div>
          <div className="brand-card-skeleton-body">
            <Skeleton width={idx % 2 === 0 ? '150px' : '180px'} height="22px" />
            <Skeleton width="120px" height="14px" />
            <Skeleton width="90%" height="32px" />
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <Skeleton width="80px" height="14px" />
              <Skeleton width="60px" height="14px" pill />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <Skeleton width="120px" height="32px" radius="var(--radius)" />
              <Skeleton width="60px" height="32px" radius="var(--radius)" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Bulk Pricing table row skeleton.
 */
export function BulkPricingRowSkeleton({ count = 5 }) {
  return Array.from({ length: count }, (_, idx) => (
    <tr key={`sk-bulk-row-${idx}`} className="skeleton-row" aria-hidden="true">
      <td>
        <div className="skeleton-cell-stack">
          <Skeleton width={idx % 2 === 0 ? '120px' : '150px'} height="16px" />
          <Skeleton width="90px" height="12px" />
        </div>
      </td>
      <td>
        <div className="skeleton-cell-stack">
          <Skeleton width="140px" height="14px" />
          <Skeleton width="120px" height="14px" />
        </div>
      </td>
      <td>
        <Skeleton width="70px" height="16px" />
      </td>
      <td>
        <Skeleton width="70px" height="16px" />
      </td>
      <td>
        <Skeleton width="65px" height="24px" pill />
      </td>
      <td className="bulk-pricing-actions-col">
        <Skeleton width="60px" height="30px" radius="var(--radius)" />
      </td>
    </tr>
  ))
}

export default Skeleton
