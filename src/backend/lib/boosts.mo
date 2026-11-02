import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Types "../types/boosts";

module {
  /// Returns the caller's boost state, creating an empty one on first access.
  public func getOrCreate(
    store : Map.Map<Principal, Types.UserBoosts>,
    caller : Principal,
  ) : Types.UserBoosts {
    switch (store.get(caller)) {
      case (?state) { state };
      case null {
        let fresh : Types.UserBoosts = {
          var nextId = 0;
          var totalBoosts = 0;
          var powerLevel = 0;
          boosts = List.empty();
        };
        store.add(caller, fresh);
        fresh;
      };
    };
  };

  /// Records one boost for the caller and returns the updated stats.
  public func recordBoost(
    store : Map.Map<Principal, Types.UserBoosts>,
    caller : Principal,
  ) : Types.BoostStats {
    let state = getOrCreate(store, caller);
    let boost : Types.Boost = {
      id = state.nextId;
      timestamp = Time.now();
    };
    state.nextId += 1;
    state.totalBoosts += 1;
    state.powerLevel += 1;
    state.boosts.add(boost);
    { totalBoosts = state.totalBoosts; powerLevel = state.powerLevel };
  };

  /// Returns the caller's boosts, newest first.
  public func listBoosts(
    store : Map.Map<Principal, Types.UserBoosts>,
    caller : Principal,
  ) : [Types.Boost] {
    switch (store.get(caller)) {
      case (?state) {
        let snapshot = state.boosts.toArray();
        snapshot.reverse();
      };
      case null { [] };
    };
  };

  /// Returns the caller's aggregate stats.
  public func getStats(
    store : Map.Map<Principal, Types.UserBoosts>,
    caller : Principal,
  ) : Types.BoostStats {
    switch (store.get(caller)) {
      case (?state) {
        { totalBoosts = state.totalBoosts; powerLevel = state.powerLevel };
      };
      case null { { totalBoosts = 0; powerLevel = 0 } };
    };
  };

  /// Clears the caller's counter and history.
  public func reset(
    store : Map.Map<Principal, Types.UserBoosts>,
    caller : Principal,
  ) : Types.BoostStats {
    let state = getOrCreate(store, caller);
    state.nextId := 0;
    state.totalBoosts := 0;
    state.powerLevel := 0;
    state.boosts.clear();
    { totalBoosts = 0; powerLevel = 0 };
  };
};
