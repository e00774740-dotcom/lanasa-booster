import Map "mo:core/Map";
import Principal "mo:core/Principal";
import FfPerfLib "../lib/ffperf";
import Types "../types/ffperf";

mixin (
  store : Map.Map<Principal, Types.FfPerfSettings>,
) {
  /// Returns the caller's saved FF Performance settings, or the defaults when none saved.
  public query ({ caller }) func getFfPerfSettings() : async Types.FfPerfSettings {
    FfPerfLib.get(store, caller);
  };

  /// Saves the caller's FF Performance settings and returns the stored value.
  public shared ({ caller }) func saveFfPerfSettings(settings : Types.FfPerfSettings) : async Types.FfPerfSettings {
    FfPerfLib.save(store, caller, settings);
  };

  /// Restores the caller's FF Performance settings to the module defaults.
  public shared ({ caller }) func resetFfPerfSettings() : async Types.FfPerfSettings {
    FfPerfLib.reset(store, caller);
  };
};
