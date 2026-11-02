import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "../types/auto";

module {
  /// A single Auto settings row flattened for OQL, carrying its owner principal.
  public type AutoRow = {
    owner : Principal;
    buttonX : Nat;
    buttonY : Nat;
    swipeDistance : Nat;
    gestureDuration : Nat;
    pauseBetween : Nat;
    shotsPerBurst : Nat;
    refreshRate : Nat;
    shizukuActive : Bool;
  };

  /// Flattens every user's Auto settings into one iterable of rows.
  public func allRows(
    store : Map.Map<Principal, Types.AutoSettings>,
  ) : Iter.Iter<AutoRow> {
    let rows = List.empty<AutoRow>();
    for ((owner, settings) in store.entries()) {
      rows.add({
        owner;
        buttonX = settings.buttonX;
        buttonY = settings.buttonY;
        swipeDistance = settings.swipeDistance;
        gestureDuration = settings.gestureDuration;
        pauseBetween = settings.pauseBetween;
        shotsPerBurst = settings.shotsPerBurst;
        refreshRate = settings.refreshRate;
        shizukuActive = settings.shizukuActive;
      });
    };
    rows.values();
  };
};
