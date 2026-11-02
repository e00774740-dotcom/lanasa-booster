import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "../types/auto";

module {
  /// Returns the caller's saved Auto settings, or the script defaults when the
  /// caller has never saved any. Never creates an entry for a read.
  public func get(
    store : Map.Map<Principal, Types.AutoSettings>,
    caller : Principal,
  ) : Types.AutoSettings {
    switch (store.get(caller)) {
      case (?settings) { settings };
      case null { Types.defaults };
    };
  };

  /// Saves the caller's Auto settings and returns the stored value.
  public func save(
    store : Map.Map<Principal, Types.AutoSettings>,
    caller : Principal,
    settings : Types.AutoSettings,
  ) : Types.AutoSettings {
    store.add(caller, settings);
    settings;
  };

  /// Restores the caller's Auto settings to the script defaults and returns them.
  public func reset(
    store : Map.Map<Principal, Types.AutoSettings>,
    caller : Principal,
  ) : Types.AutoSettings {
    store.add(caller, Types.defaults);
    Types.defaults;
  };
};
