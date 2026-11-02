import AccessControl "mo:caffeineai-authorization/access-control";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  public type OldActor = {};
  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    boosts : Map.Map<Principal, UserBoosts>;
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

  public func migration(_ : OldActor) : NewActor {
    {
      accessControlState = AccessControl.initState();
      boosts = Map.empty();
    };
  };
};
