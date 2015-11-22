System.log( "Retire Server - User Form Data" );

try  {	
	user				= __asd_requestedFor;
	user				= user.split("@");
	user				= user[0];
	
	Server_Data				= new Array();	
	UnMap_LUNs				= new Array();	
	Delete_LUNs				= new Array();	
	Port_Data					= new Array();	
	var ReservationId	= new Array();
	var ClusterId 		= new Array();				
	
	//Define Prod and DR Naming Convention
	if(tenant != "ISP"){
		if(Hostname.indexOf("OVM-PP") == -1){
			var DRHostname 	= "DR-"+Hostname;
			System.log("DRHostname:"+DRHostname);	
		}
		else {
			var DRHostname	= Hostname;
			DRHostname = DRHostname.split("OVM-PP").join("OVM-SD"); 
			System.log("DRHostname:"+DRHostname);
		}
		if(Cluster.indexOf("OVM-PP-") == -1 && Cluster.indexOf("STANDALONE") == -1){
			var DRCluster	= "DR-"+Cluster;
			System.log("DRCluster:"+DRCluster);
		}
		else {
			var DRCluster 	= Cluster;
			DRCluster 		= DRCluster.split("OVM-PP-").join("OVM-SD-"); 
			System.log("DRCluster:"+DRCluster);
		}
	}
	else if(tenant == "ISP"){
		if(Hostname.indexOf("-PP") > -1){
			var DRHostname	= Hostname;
			DRHostname = DRHostname.split("-PP").join("-SD");	 		
			System.log("DRHostname:"+DRHostname);
		}
		if(Cluster.indexOf("-PP-") > -1){
			var DRCluster 	= Cluster;
			DRCluster = DRCluster.split("-PP-").join("-SD-"); 		
			System.log("DRCluster:"+DRCluster);
		}
		else {
			var DRCluster 	= Cluster;
		}									
	}	
			
	var ProjectId = getID("Project", "ProjectCode", ProjectCode);			
	
	for each (var customerAdmin in customerAdmins){
		if(tenant == customerAdmin.tenant){
			customer_ldapUser = customerAdmin.admins;
		}
	}
	
	var vcac_cafeHost;
	for each (var cafeHost in cafeHosts){
		if(tenant == cafeHost.tenant){
			vcac_cafeHost = cafeHost.vCacHost;
		}
	}
	
	var req = vCACCAFEEntitiesFinder.getCatalogItemRequest(vcac_cafeHost, __asd_catalogRequestId);  	 	
	var vraRequestId = req.requestNumber;
	System.log(vraRequestId);

	insRequest(vraRequestId, "0000-00-00", user, user, ProjectId, state, "Architect", tenant);																																														
	if(RetireAllNodes && Cluster != "STANDALONE") {
		HasStorage = true;
		
		var selectQuery = "SELECT ClusterId FROM FarmObject as F JOIN Cluster as C ON F.ClusterId=C.Id JOIN ServiceLevel as SL ON F.ServiceLevelId=SL.Id JOIN Service as S ON SL.ServiceId=S.Id WHERE C.Name = '"+Cluster+"' AND F.Name = '"+Hostname+"' AND F.Serial = '"+Serial+"' AND S.Name = '"+tenant+"';";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);			
																														
		if(res.length == 1){
			ClusterId[0] = res[0].getProperty("ClusterId"); 
			System.log( "ClusterId[0] >"+ClusterId[0] );					
		}			
		
		var selectQuery = "SELECT ClusterId FROM FarmObject as F JOIN Cluster as C ON F.ClusterId=C.Id JOIN ServiceLevel as SL ON F.ServiceLevelId=SL.Id JOIN Service as S ON SL.ServiceId=S.Id WHERE C.Name = '"+DRCluster+"' AND S.Name = '"+tenant+"';";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);						
	
		if(res.length == 1){
			ClusterId[1] = res[0].getProperty("ClusterId"); 
			System.log( "ClusterId[1] >"+ClusterId[1] );
		}	
																																								
		var selectQuery = "SELECT Id, Name as Hostname, Serial, ServiceProfile FROM FarmObject WHERE ClusterId ="+ClusterId[0]+";";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);			
		if(res.length > 0){		
			for(var x in res){					
				var server 				= new Object();	
				server.FarmObjectId		= res[x].getProperty("Id");			
				server.ForeignBank		= tenant;	
				server.Hostname			= res[x].getProperty("Hostname");
				server.Serial			= res[x].getProperty("Serial");								
				server.ServiceProfile	= res[x].getProperty("ServiceProfile");					
				Server_Data.push(server);					
			}
		}		
		
		if(ClusterId[1]>0){
				
			var selectQuery = "SELECT Id, Name as Hostname, Serial, ServiceProfile FROM FarmObject WHERE ClusterId ="+ClusterId[1]+";";										
			System.log( "selectQuery >"+selectQuery );
			var res = cmdb.readCustomQuery(selectQuery);			
			if(res.length > 0){		
				for(var x in res){					
					var server 				= new Object();	
					server.FarmObjectId		= res[x].getProperty("Id");			
					server.ForeignBank		= tenant;	
					server.Hostname			= res[x].getProperty("Hostname");
					server.Serial			= res[x].getProperty("Serial");								
					server.ServiceProfile	= res[x].getProperty("ServiceProfile");					
					Server_Data.push(server);					
				}
			}		
		}
		for(var x=0; x<Server_Data.length; x++){	
			// Lun_Data				
			var selectQuery = "SELECT F.Name as Hostname, L.Id, LunLabel, UidSerial, Size FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
			System.log( "selectQuery >"+selectQuery );
			var luns = cmdb.readCustomQuery(selectQuery);
			if(luns.length > 0){		
				for(var z in luns){				
					var lun 				= new Object();	
					lun.Hostname			= Server_Data[x].Hostname;	
					lun.LunId				= luns[z].getProperty("Id");		
					lun.LunLabel			= luns[z].getProperty("LunLabel");
					lun.UidSerial			= luns[z].getProperty("UidSerial");								
					lun.Size				= luns[z].getProperty("Size");	
					lun.FarmObjectId		= Server_Data[x].FarmObjectId;
					Delete_LUNs.push(lun);				
				}	
			}		
			// Port_Data		
			var selectQuery = "SELECT F.Name as Hostname, P.Id, PortNo, P.State, Type, WWPN, MAC FROM Port as P JOIN FarmObject as F ON F.Id=P.FarmObjectId WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
			System.log( "selectQuery >"+selectQuery );
			var ports = cmdb.readCustomQuery(selectQuery);
			if(ports.length > 0){		
				for(var y in ports){				
					var port 				= new Object();		
					port.Hostname			= ports[y].getProperty("Hostname");
					port.PortId				= ports[y].getProperty("Id");		
					port.PortNo				= ports[y].getProperty("PortNo");
					port.State				= ports[y].getProperty("State");
					port.Type				= ports[y].getProperty("Type");								
					port.WWPN				= ports[y].getProperty("WWPN");	
					port.MAC				= ports[y].getProperty("MAC");
					Port_Data.push(port);				
				}		
			}		
			//Reservation Data
			var selectQuery = "SELECT Id FROM Reservation WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
			System.log( "selectQuery >"+selectQuery );
			var reservations = cmdb.readCustomQuery(selectQuery);
			if(reservations.length > 0){
				for(var z in reservations){						
					ReservationId[z]		= reservations[z].getProperty("Id");										
				}		
			}																		
		}																																														
	}	
	else if((RetireAllNodes || !RetireAllNodes) && Cluster == "STANDALONE"){
		//Node Data		
		var selectQuery = "SELECT F.Id, ServiceProfile FROM FarmObject as F JOIN ServiceLevel as SL ON F.ServiceLevelId=SL.Id JOIN Service as S ON SL.ServiceId=S.Id WHERE F.Name = '"+Hostname+"' AND F.Serial = '"+Serial+"' AND S.Name='"+tenant+"';";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);
		if(res.length == 1){						
			var server 				= new Object();	
			server.FarmObjectId		= res[0].getProperty("Id");			
			server.Hostname			= Hostname;
			server.Serial			= Serial;							
			server.ServiceProfile	= res[0].getProperty("ServiceProfile");	
			server.ForeignBank		= tenant;	
			Server_Data.push(server);			
		}
		
		var selectQuery = "SELECT F.Id, Serial, ServiceProfile FROM FarmObject as F JOIN ServiceLevel as SL ON F.ServiceLevelId=SL.Id JOIN Service as S ON SL.ServiceId=S.Id WHERE F.Name = '"+DRHostname+"' AND S.Name='"+tenant+"';";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);
		if(res.length == 1){						
			var server 							= new Object();	
			server.FarmObjectId			= res[0].getProperty("Id");			
			server.Hostname					= DRHostname;
			server.Serial						= res[0].getProperty("Serial");							
			server.ServiceProfile		= res[0].getProperty("ServiceProfile");	
			server.ForeignBank			= tenant;	
			Server_Data.push(server);			
		}
						
		for(var x=0; x<Server_Data.length; x++) {
		
			var selectQuery = "SELECT F.Name as Hostname, L.Id, LunLabel, UidSerial, Size FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
			System.log( "selectQuery >"+selectQuery );
			var luns = cmdb.readCustomQuery(selectQuery);				
			if(luns.length > 0){		
				for(var z in luns){											
					var lun 				  	= new Object();
					lun.Hostname				= Server_Data[x].Hostname;
					lun.LunId						= luns[z].getProperty("Id");										
					lun.LunLabel				= luns[z].getProperty("LunLabel");
					lun.UidSerial				= luns[z].getProperty("UidSerial");								
					lun.Size						= luns[z].getProperty("Size");
					lun.FarmObjectId		= Server_Data[x].FarmObjectId;
					Delete_LUNs.push(lun);																
				}
				HasStorage = true;					
			}
	
			// Port_Data		
			var selectQuery = "SELECT F.Name as Hostname, P.Id, PortNo, P.State, Type, WWPN, MAC FROM Port as P JOIN FarmObject as F ON F.Id=P.FarmObjectId WHERE P.FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
			System.log( "selectQuery >"+selectQuery );
			var ports = cmdb.readCustomQuery(selectQuery);
			if(ports.length > 0){		
				for(var y in ports){				
					var port 				  = new Object();		
					port.Hostname			= ports[y].getProperty("Hostname");
					port.PortId				= ports[y].getProperty("Id");		
					port.PortNo				= ports[y].getProperty("PortNo");
					port.State				= ports[y].getProperty("State");
					port.Type					= ports[y].getProperty("Type");								
					port.WWPN					= ports[y].getProperty("WWPN");	
					port.MAC					= ports[y].getProperty("MAC");
					Port_Data.push(port);				
				}		
			}		
			//Reservation Data
			var selectQuery = "SELECT Id FROM Reservation WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
			System.log( "selectQuery >"+selectQuery );
			var reservations = cmdb.readCustomQuery(selectQuery);
			if(reservations.length > 0){		
				for(var z in reservations){						
					ReservationId[z]		= reservations[z].getProperty("Id");										
				}		
			}	
		}	
	}	
	else if(!RetireAllNodes && Cluster != "STANDALONE"){
		HasStorage = true;

		var ProdActiveNodes 	= new Array();
		var DRActiveNodes			= new Array();
				
		//Get Cluster IDs use tenant variable for extra safety
		var selectQuery = "SELECT C.Id FROM FarmObject as F JOIN Cluster as C ON F.ClusterId=C.Id JOIN ServiceLevel as SL ON F.ServiceLevelId=SL.Id JOIN Service as S ON SL.ServiceId=S.Id  WHERE C.Name = '"+Cluster+"' AND F.Name='"+Hostname+"' AND F.Serial='"+Serial+"' AND S.Name='"+tenant+"';";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);
																														
		if(res.length == 1){
			ClusterId[0] = res[0].getProperty("Id"); 
			System.log( "ClusterId[0] >"+ClusterId[0] );
		}						
		
		//Do not use DRHostname instead use DRCluster. Example node2 of a cluster in DR may not exist
		var selectQuery = "SELECT C.Id FROM FarmObject as F JOIN Cluster as C ON F.ClusterId=C.Id JOIN ServiceLevel as SL ON F.ServiceLevelId=SL.Id JOIN Service as S ON SL.ServiceId=S.Id WHERE C.Name = '"+DRCluster+"' AND S.Name='"+tenant+"';";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);	
					
		if(res.length == 1){
			ClusterId[1] = res[0].getProperty("Id"); 
			System.log( "ClusterId[1] >"+ClusterId[1] );
		}																																																																								
		
		//Determine Number of Active Nodes of Production and DR Clusters
		var selectQuery = "SELECT Id FROM FarmObject WHERE ClusterId = "+ClusterId[0]+" AND State='Active';";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);
		if(res.length > 0){		
			for(var x in res){					
				ProdActiveNodes[x]		= res[x].getProperty("Id");						
			}
		}
		
		var selectQuery = "SELECT Id FROM FarmObject WHERE ClusterId = "+ClusterId[1]+" AND State='Active';";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);
		if(res.length > 0){		
			for(var x in res){					
				DRActiveNodes[x]		= res[x].getProperty("Id");						
			}
		}
															
		//Get All Nodes to be retired --> Implies that DR nodes come after Prod Nodes always.				
		var selectQuery = "SELECT Id, Name as Hostname, Serial, ServiceProfile FROM FarmObject as F JOIN ServiceLevel as SL ON F.ServiceLevelId=SL.Id JOIN Service as S ON SL.ServiceId=S.Id WHERE S.Name='"+tenant+"' AND (Name = '"+Hostname+"' AND Serial = '"+Serial+"') OR Name = '"+DRHostname+"';";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);
		if(res.length > 0){		
			for(var x in res){					
				var server 				= new Object();	
				server.FarmObjectId		= res[x].getProperty("Id");			
				server.ForeignBank		= tenant;	
				server.Hostname			= res[x].getProperty("Hostname");
				server.Serial			= res[x].getProperty("Serial");								
				server.ServiceProfile	= res[x].getProperty("ServiceProfile");					
				Server_Data.push(server);					
			}
		}	
		
		//If DRActiveNodes is == 1 then we can delete LUNs in DR site including boot LUN provided it is the corresponding DR Server.										
		if(ProdActiveNodes.length > 1 && DRActiveNodes.length == 1 ){ 			
										
			//ProdActiveNodes[0] contains the id of the primary node of the cluster which is contained in the LUN table. This will identify all the data LUN information to be unmapped.
			// The actual node to unmap is contained in Server_Data[0] array. This way the user can view the details of all the LUNs to be unmapped. 									
					
			var selectQuery = "SELECT Id, LunLabel, UidSerial, Size FROM Lun WHERE FarmObjectId = '"+ProdActiveNodes[0]+"' AND L.IsBootLun='false';";										
			System.log( "selectQuery > "+selectQuery );
			var luns = cmdb.readCustomQuery(selectQuery);				
			if(luns.length > 0){		
				for(var z in luns){											
					var lun 				= new Object();
					lun.Hostname			= Server_Data[0].Hostname;
					lun.LunId				= luns[z].getProperty("Id");										
					lun.LunLabel			= luns[z].getProperty("LunLabel");
					lun.UidSerial			= luns[z].getProperty("UidSerial");								
					lun.Size				= luns[z].getProperty("Size");
					lun.FarmObjectId		= Server_Data[0].FarmObjectId;	
					UnMap_LUNs.push(lun);																
				}																								
			}				
						
			//The boot LUNs are contained in the LUN table in a one to one association therefore we can use the Server_Data[0] array to get the Boot LUN information. 								
			//Boot LUNs having a one to one association are always deleted rather than unmapped therefore we load them into the Delete_LUN array.
			var selectQuery = "SELECT Id, LunLabel, UidSerial, Size FROM Lun WHERE FarmObjectId = "+Server_Data[0].FarmObjectId+" AND IsBootLun='true';";										
			var luns = cmdb.readCustomQuery(selectQuery);				
			if(luns.length > 0){		
				for(var z in luns){											
					var lun 				= new Object();
					lun.Hostname			= Server_Data[0].Hostname;
					lun.LunId				= luns[z].getProperty("Id");										
					lun.LunLabel			= luns[z].getProperty("LunLabel");
					lun.UidSerial			= luns[z].getProperty("UidSerial");								
					lun.Size				= luns[z].getProperty("Size");
					lun.FarmObjectId		= Server_Data[0].FarmObjectId;	
					Delete_LUNs.push(lun);																
				}																			
			}
			
			//Single Node in DR has all LUNs removed if the corresponding DR server exists ie DRHostname
			if (Server_Data[1]) {				
				var selectQuery = "SELECT Id, LunLabel, UidSerial, Size FROM Lun WHERE FarmObjectId = "+Server_Data[1].FarmObjectId+";";										
				System.log( "selectQuery >"+selectQuery );
				var luns = cmdb.readCustomQuery(selectQuery);				
				if(luns.length > 0){		
					for(var z in luns){											
						var lun 				= new Object();
						lun.Hostname			= Server_Data[1].Hostname;
						lun.LunId				= luns[z].getProperty("Id");										
						lun.LunLabel			= luns[z].getProperty("LunLabel");
						lun.UidSerial			= luns[z].getProperty("UidSerial");								
						lun.Size				= luns[z].getProperty("Size");
						lun.FarmObjectId		= Server_Data[1].FarmObjectId;
						Delete_LUNs.push(lun);																
					}																			
				}					
			}
		
			for(var x=0; x<Server_Data.length; x++){									
				// Port_Data		
				var selectQuery = "SELECT F.Name as Hostname, P.Id, PortNo, P.State, Type, WWPN, MAC FROM Port as P JOIN FarmObject as F ON F.Id=P.FarmObjectId WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
				var ports = cmdb.readCustomQuery(selectQuery);
				if(ports.length > 0){
					for(var y in ports){				
						var port 				= new Object();		
						port.Hostname			= ports[y].getProperty("Hostname");
						port.PortId				= ports[y].getProperty("Id");		
						port.PortNo				= ports[y].getProperty("PortNo");
						port.State				= ports[y].getProperty("State");
						port.Type				= ports[y].getProperty("Type");								
						port.WWPN				= ports[y].getProperty("WWPN");	
						port.MAC				= ports[y].getProperty("MAC");
						Port_Data.push(port);				
					}		
				}		
				//Reservation Data
				var selectQuery = "SELECT Id FROM Reservation WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
				var reservations = cmdb.readCustomQuery(selectQuery);
				if(reservations.length > 0){	
					for(var z in reservations){						
						ReservationId[z]		= reservations[z].getProperty("Id");										
					}		
				}																																						
			} //End of for loop																															
		}				
		else if(ProdActiveNodes.length == 1 && DRActiveNodes.length == 1) {					
			for(var x=0; x<Server_Data.length; x++){
				// Port_Data		
				var selectQuery = "SELECT F.Name as Hostname, P.Id, PortNo, P.State, Type, WWPN, MAC FROM Port as P JOIN FarmObject as F ON F.Id=P.FarmObjectId WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
				var ports = cmdb.readCustomQuery(selectQuery);
				if(ports.length > 0){		
					for(var y in ports){				
						var port 				= new Object();		
						port.Hostname			= ports[y].getProperty("Hostname");
						port.PortId				= ports[y].getProperty("Id");		
						port.PortNo				= ports[y].getProperty("PortNo");
						port.State				= ports[y].getProperty("State");
						port.Type				= ports[y].getProperty("Type");								
						port.WWPN				= ports[y].getProperty("WWPN");	
						port.MAC				= ports[y].getProperty("MAC");
						Port_Data.push(port);				
					}		
				}		
				//Reservation Data
				var selectQuery = "SELECT Id FROM Reservation WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
				var reservations = cmdb.readCustomQuery(selectQuery);
				if(reservations.length > 0){		
					for(var z in reservations){						
						ReservationId[z]		= reservations[z].getProperty("Id");										
					}							
				}	

				//If it is the last node of the cluster we can delete all LUNs both in Production and DR site.		
				var selectQuery = "SELECT Id, LunLabel, UidSerial, Size FROM Lun WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
				var luns = cmdb.readCustomQuery(selectQuery);				
				if(luns.length > 0){		
					for(var z in luns){											
						var lun 				= new Object();
						lun.Hostname			= Server_Data[x].Hostname;
						lun.LunId				= luns[z].getProperty("Id");										
						lun.LunLabel			= luns[z].getProperty("LunLabel");
						lun.UidSerial			= luns[z].getProperty("UidSerial");								
						lun.Size				= luns[z].getProperty("Size");
						lun.FarmObjectId		= Server_Data[x].FarmObjectId;
						Delete_LUNs.push(lun);																
					}																			
				}		
			}																									
		}	
		else if(ProdActiveNodes.length > 1 && DRActiveNodes.length > 1) {			
			for(var x=0; x<Server_Data.length; x++){
				// Port_Data		
				var selectQuery = "SELECT Id, PortNo, State, Type, WWPN, MAC FROM Port WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
				var ports = cmdb.readCustomQuery(selectQuery);
				if(ports.length > 0){
					for(var y in ports){				
						var port 				= new Object();		
						port.Hostname			= Server_Data[x].Hostname;
						port.PortId				= ports[y].getProperty("Id");		
						port.PortNo				= ports[y].getProperty("PortNo");
						port.State				= ports[y].getProperty("State");
						port.Type				= ports[y].getProperty("Type");								
						port.WWPN				= ports[y].getProperty("WWPN");	
						port.MAC				= ports[y].getProperty("MAC");
						Port_Data.push(port);				
					}		
				}		
				//Reservation Data
				var selectQuery = "SELECT Id FROM Reservation WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
				var reservations = cmdb.readCustomQuery(selectQuery);
				if(reservations.length > 0){	
					for(var z in reservations){						
						ReservationId[z]		= reservations[z].getProperty("Id");										
					}		
				}		

				// As above if Boot LUNs one to one association we can delete them.	
				var selectQuery = "SELECT Id, LunLabel, UidSerial, Size FROM Lun WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+" AND IsBootLun='true';";										
				var luns = cmdb.readCustomQuery(selectQuery);				
				if(luns.length > 0){		
					for(var z in luns){											
						var lun 				= new Object();
						lun.Hostname			= Server_Data[x].Hostname;	
						lun.LunId				= luns[z].getProperty("Id");										
						lun.LunLabel			= luns[z].getProperty("LunLabel");
						lun.UidSerial			= luns[z].getProperty("UidSerial");								
						lun.Size				= luns[z].getProperty("Size");
						lun.FarmObjectId		= Server_Data[x].FarmObjectId;	
						Delete_LUNs.push(lun);																
					}																			
				}
			}			
			
			//ProdActiveNodes[0] contains primary node which is contained in LUN table. We add this to the UnMap_LUNs array since we have multiple nodes.
			var selectQuery = "SELECT Id, LunLabel, UidSerial, Size FROM Lun WHERE FarmObjectId = '"+ProdActiveNodes[0]+"' AND L.IsBootLun='false';";									
			var luns = cmdb.readCustomQuery(selectQuery);				
			if(luns.length > 0){		
				for(var z in luns){											
					var lun 				= new Object();
					lun.Hostname			= Server_Data[0].Hostname;
					lun.LunId				= luns[z].getProperty("Id");										
					lun.LunLabel			= luns[z].getProperty("LunLabel");
					lun.UidSerial			= luns[z].getProperty("UidSerial");								
					lun.Size				= luns[z].getProperty("Size");
					lun.FarmObjectId		= Server_Data[0].FarmObjectId;	
					UnMap_LUNs.push(lun);																
				}																			
			}								
			
			//DRActiveNodes[0] contains the primary node of the DR cluster contained in the LUN table. We add this to the UnMap_LUNs array since we have multiple nodes.						
			var selectQuery = "SELECT F.Name as Hostname, L.Id, LunLabel, UidSerial, Size FROM Lun WHERE FarmObjectId = '"+DRActiveNodes[0]+"' AND L.IsBootLun='false';";									
			var luns = cmdb.readCustomQuery(selectQuery);				
			if(luns.length > 0){		
				for(var z in luns){											
					var lun 				= new Object();
					lun.Hostname			= Server_Data[1].Hostname;
					lun.LunId				= luns[z].getProperty("Id");										
					lun.LunLabel			= luns[z].getProperty("LunLabel");
					lun.UidSerial			= luns[z].getProperty("UidSerial");								
					lun.Size				= luns[z].getProperty("Size");
					lun.FarmObjectId		= Server_Data[1].FarmObjectId;	
					UnMap_LUNs.push(lun);																
				}																			
			}																																																										
		}																								
	}																																																														
} catch(ex){
	throw "Retire Server - User Form Data - ERROR: "+ex;
}

function getID(tableName, param, value) {
	
	var selectQuery = "SELECT Id FROM " + tableName + " WHERE " + param + " = '" + value + "';"; 
	
	System.log( "selectQuery >" + selectQuery );
	
	var result = cmdb.readCustomQuery(selectQuery);
	System.log( "result >" + result );
	
	var returnId;
	if(result.length == 1) {
		returnId = result[0].getProperty("Id");
	}
	
	return returnId;
}

function insRequest(RequestNumber, CompletedDate, CreatedBy, UpdatedBy, ProjectId, state, Office, Tenant) {

	var CreatedDate			= "CURRENT_TIMESTAMP";
	var Element 			= workflow.name;
	
	var sqlStatement = "INSERT INTO Request(RequestId, Element, CreatedDate, CompletedDate, CreatedBy, UpdatedBy, ProjectId, Action_State, Office, Tenant) OUTPUT Inserted.Id ";
	sqlStatement = sqlStatement + "VALUES(";
  sqlStatement = sqlStatement + "'"+RequestNumber+"',";
	sqlStatement = sqlStatement + "'"+Element+"',";
	sqlStatement = sqlStatement + ""+CreatedDate+",";
	sqlStatement = sqlStatement + ""+CompletedDate+",";
	sqlStatement = sqlStatement + "'"+CreatedBy+"',";
	sqlStatement = sqlStatement + "'"+UpdatedBy+"',";
	sqlStatement = sqlStatement + ""+ProjectId+",";
	sqlStatement = sqlStatement + "'"+state+"',";
	sqlStatement = sqlStatement + "'"+Office+"',";
	sqlStatement = sqlStatement + "'"+Tenant+"'";
	sqlStatement = sqlStatement + ");";
	
	System.log( "sqlStatement >" + sqlStatement );
	var returnId;
	var result = cmdb.readCustomQuery(sqlStatement);
		
	if( result.length == 1 ) {
		returnId = result[0].getProperty("Id");
		System.log( "Row ("+RequestNumber+") inserted in table successfully" );
	}
	else{
        System.error( "Row insertion in table failed" );
    }	
	return returnId;
}
