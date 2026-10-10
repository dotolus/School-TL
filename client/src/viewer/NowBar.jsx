export function NowBar({ inRange, currentMonthName, onJump }) {
  return (
    <div className="now-bar">
      <div className="label">
        {inRange ? (
          <>
            אנחנו כרגע ב<b>{currentMonthName}</b> — החודש מסומן בציר למטה.
          </>
        ) : (
          "התאריך הנוכחי נמצא מחוץ לטווח שנת הלימודים המוצגת כאן."
        )}
      </div>
      <button type="button" onClick={onJump}>
        קפיצה לחודש הנוכחי
      </button>
    </div>
  );
}
