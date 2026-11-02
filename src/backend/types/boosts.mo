import Common "common";
import List "mo:core/List";

module {
  /// A single recorded boost impulse.
  public type Boost = {
    id : Nat;
    timestamp : Common.Timestamp;
  };

  /// Aggregate counters for the caller's boost activity.
  public type BoostStats = {
    totalBoosts : Nat;
    powerLevel : Nat;
  };

  /// Per-user boost state: the recorded impulses plus the running counters.
  public type UserBoosts = {
    var nextId : Nat;
    var totalBoosts : Nat;
    var powerLevel : Nat;
    boosts : List.List<Boost>;
  };
};
