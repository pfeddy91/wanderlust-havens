import React, { ReactNode } from 'react';
import styles from './FancyButton.module.css';
import { Mail } from 'lucide-react'; // Using Mail icon as a placeholder for "Get in Touch"

interface FancyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode; // Allow passing a custom icon
}

const FancyButton: React.FC<FancyButtonProps> = ({
  children,
  onClick,
  icon,
  ...props
}) => {
  const buttonText = React.Children.toArray(children).join('');
  const letters = buttonText.split('').map((char, index) => (
    <span
      key={index}
      style={{ '--i': index } as React.CSSProperties}
      // The CSS module will not automatically apply styles to dynamically generated spans like this
      // The animations are applied via .state p span, so this structure is correct.
    >
      {char}
    </span>
  ));

  // Determine the icon to display
  const displayIcon = icon !== undefined ? icon : (
    <Mail size={24} className="text-inherit" /> // Default icon if none provided
  );

  return (
    <button className={styles.button} onClick={onClick} {...props} type="button">
      <span className={styles.outline}></span>
      {/* Default state */}
      <span className={`${styles.state} ${styles['state--default']}`}>
        {displayIcon && <span className={styles.icon}>{displayIcon}</span>}
        <p>{letters}</p>
      </span>

      {/* 
        The original CSS includes a '.state--sent'.
        This is typically for actions like form submissions.
        For a "Get in Touch" navigation button, this might not be needed.
        If you require a "sent" or "success" state, you would add JSX like:
      */}
      {/*
      <span className={`${styles.state} ${styles['state--sent']}`}>
        <span className={styles.icon}>
          { // Placeholder for sent icon, e.g., CheckCircle from lucide-react
            // <CheckCircle size={24} />
          }
        </span>
        <p>
          {'Sent!'.split('').map((char, index) => (
            <span key={index} style={{ '--i': index } as React.CSSProperties}>{char}</span>
          ))}
        </p>
      </span>
      */}
    </button>
  );
};

export default FancyButton; 