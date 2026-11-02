import AccessControl "mo:caffeineai-authorization/access-control";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // OldActor mirrors the NewActor of the preceding migration (00000000_000000).
  public type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    boosts : Map.Map<Principal, UserBoosts>;
  };

  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    boosts : Map.Map<Principal, UserBoosts>;
    autoSettings : Map.Map<Principal, AutoSettings>;
  };

  // Inlined to keep the migration self-contained (no project imports).
  public type Boost = {
    id : Nat;
    timestamp : Int;
  };

  public type UserBoosts = {
    var nextId : Nat;
    var totalBoosts : Nat;
    var powerLevel : Nat;
    boosts : List.List<Boost>;
  };

  public type AutoSettings = {
    buttonX : Nat;
    buttonY : Nat;
    swipeDistance : Nat;
    gestureDuration : Nat;
    pauseBetween : Nat;
    shotsPerBurst : Nat;
  };

  public func migration(old : OldActor) : NewActor {
    {
      accessControlState = old.accessControlState;
      boosts = old.boosts;
      autoSettings = Map.empty();
    };
  };
};
