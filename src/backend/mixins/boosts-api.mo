import Map "mo:core/Map";
import Principal "mo:core/Principal";
import BoostsLib "../lib/boosts";
import Types "../types/boosts";

mixin (
  store : Map.Map<Principal, Types.UserBoosts>,
) {
  /// Returns the caller's boosts, newest first.
  public query ({ caller }) func listBoosts() : async [Types.Boost] {
    BoostsLib.listBoosts(store, caller);
  };

  /// Returns the caller's total boost count and current power level.
  public query ({ caller }) func getBoostStats() : async Types.BoostStats {
    BoostsLib.getStats(store, caller);
  };

  /// Records one boost for the caller and returns the updated stats.
  public shared ({ caller }) func recordBoost() : async Types.BoostStats {
    BoostsLib.recordBoost(store, caller);
  };

  /// Resets the caller's counter and history.
  public shared ({ caller }) func resetBoosts() : async Types.BoostStats {
    BoostsLib.reset(store, caller);
  };
};
