import Map "mo:core/Map";
import Principal "mo:core/Principal";
import AutoLib "../lib/auto";
import Types "../types/auto";

mixin (
  store : Map.Map<Principal, Types.AutoSettings>,
) {
  /// Returns the caller's saved Auto settings, or the defaults when none saved.
  public query ({ caller }) func getAutoSettings() : async Types.AutoSettings {
    AutoLib.get(store, caller);
  };

  /// Saves the caller's Auto settings and returns the stored value.
  public shared ({ caller }) func saveAutoSettings(settings : Types.AutoSettings) : async Types.AutoSettings {
    AutoLib.save(store, caller, settings);
  };

  /// Restores the caller's Auto settings to the script defaults.
  public shared ({ caller }) func resetAutoSettings() : async Types.AutoSettings {
    AutoLib.reset(store, caller);
  };
};
