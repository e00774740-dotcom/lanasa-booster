module {
  /// Per-caller tunable parameters for the «FF Performance Core» module
  /// (id ff_perf, version v1.0, versionCode 1).
  public type FfPerfSettings = {
    /// Target frames per second.
    targetFps : Nat;
    /// CPU governor choice.
    cpuGovernor : Text;
    /// I/O scheduler choice.
    ioScheduler : Text;
    /// Network mode choice.
    networkMode : Text;
    /// Thermal profile choice.
    thermalProfile : Text;
  };

  /// The module's calibration defaults, returned when a caller has never saved.
  public let defaults : FfPerfSettings = {
    targetFps = 120;
    cpuGovernor = "performance";
    ioScheduler = "cfq";
    networkMode = "balanced";
    thermalProfile = "balanced";
  };
};
