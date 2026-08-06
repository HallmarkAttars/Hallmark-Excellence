import './DeliveryBar.css'

export default function DeliveryBar() {
  return (
    <div className="delivery-bar" role="region" aria-label="Announcement">
      <p className="delivery-bar-text">
        <svg
          className="delivery-bar-icon"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 5h13v11H2z" />
          <path d="M15 9h4l3 3v4h-7z" />
          <circle cx="7" cy="18.5" r="1.6" />
          <circle cx="17.5" cy="18.5" r="1.6" />
        </svg>
        Free Delivery on Orders Over ₹999
      </p>
    </div>
  )
}
