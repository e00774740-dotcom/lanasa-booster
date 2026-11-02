import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "../types/ffperf";

module {
  /// Returns the caller's saved FF Performance settings, or the module defaults
  /// when the caller has never saved any. Never creates an entry for a read.
  public func get(
    store : Map.Map<Principal, Types.FfPerfSettings>,
    caller : Principal,
  ) : Types.FfPerfSettings {
    switch (store.get(caller)) {
      case (?settings) { settings };
      case null { Types.defaults };
    };
  };

  /// Saves the caller's FF Performance settings and returns the stored value.
  public func save(
    store : Map.Map<Principal, Types.FfPerfSettings>,
    caller : Principal,
    settings : Types.FfPerfSettings,
  ) : Types.FfPerfSettings {
    store.add(caller, settings);
    settings;
  };

  /// Restores the caller's FF Performance settings to the module defaults and
  /// returns them.
  public func reset(
    store : Map.Map<Principal, Types.FfPerfSettings>,
    caller : Principal,
  ) : Types.FfPerfSettings {
    store.add(caller, Types.defaults);
    Types.defaults;
  };
};
