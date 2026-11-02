module {
  /// Per-caller tunable parameters for the «Auto» burst module.
  /// Mirrors the calibration constants of the headshot script.
  public type AutoSettings = {
    /// Button X position in device pixels.
    buttonX : Nat;
    /// Button Y position in device pixels.
    buttonY : Nat;
    /// Swipe distance in pixels (upward drag).
    swipeDistance : Nat;
    /// Gesture duration in milliseconds.
    gestureDuration : Nat;
    /// Pause between gestures in milliseconds.
    pauseBetween : Nat;
    /// Number of swipes per burst.
    shotsPerBurst : Nat;
    /// Target display refresh rate in Hz: one of 60, 90 or 120.
    refreshRate : Nat;
    /// Whether the app has been activated with Shizuku on this account.
    shizukuActive : Bool;
  };

  /// The script's calibration defaults, returned when a caller has never saved.
  public let defaults : AutoSettings = {
    buttonX = 940;
    buttonY = 2080;
    swipeDistance = 150;
    gestureDuration = 80;
    pauseBetween = 45;
    shotsPerBurst = 5;
    refreshRate = 120;
    shizukuActive = false;
  };
};
