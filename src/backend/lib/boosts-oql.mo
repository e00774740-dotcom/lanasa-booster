import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "../types/boosts";

module {
  /// A single boost row flattened for OQL, carrying its owner principal.
  public type BoostRow = {
    id : Nat;
    owner : Principal;
    timestamp : Int;
  };

  /// Flattens every user's boosts into one iterable of rows.
  public func allRows(
    store : Map.Map<Principal, Types.UserBoosts>,
  ) : Iter.Iter<BoostRow> {
    let rows = List.empty<BoostRow>();
    for ((owner, state) in store.entries()) {
      for (boost in state.boosts.values()) {
        rows.add({ id = boost.id; owner; timestamp = boost.timestamp });
      };
    };
    rows.values();
  };
};
