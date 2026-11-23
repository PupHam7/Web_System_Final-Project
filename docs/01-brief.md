# Project Brief: [Bus-Link]

## 1. The problem
Students and other commuters pays cash upfront and the reciepts of those are scattered contributing to pollution. Conductors have to handle change by hand and apply student discounts from memory, and they have no reliable record when the signal drops. Bus operators and the university also can't easily see who rode, what was paid, or which students are enrolled.

## 2. Users and what they need to do
| User role | What they need to do in the app |
|-----------|---------------------------------|
| Passenger / Student     | Check balance, top up with an e-wallet (GCash, Maya),
                            view transaction history and receipts, show a QR ticket. 
| Terminal / Kiosk user   | Tap a card to see the balance, deposit cash, check fares
                            and bus schedules.   
| Conductor               | Scan a card or QR ticket to deduct the fare, keep working
                            offline, sync payments later.
| Conductor               | Scan a card or QR ticket to deduct the fare, keep working
                            offline, sync payments later.
| University accountant   | Deposit money to a student's card, and give Bus Link only the
                            limited student details it needs.
| Bus operator admin      | Register and block cards, manage buses and routes, check the
                            fleet, review sync status and system logs.
                        

## 3. The database behind it
Database name: bus_link_db. It has 14 tables.

Table	             |        What it holds
-----------------------------------------------------------------------------------------
PASSENGER	         |        The passenger's name, contact number, QR code, and status.
-----------------------------------------------------------------------------------------
PAYMENT_METHOD	     |        The ways to pay, such as the method name, provider, and status.
-----------------------------------------------------------------------------------------
TRANSACTION	         |        Each payment, linking the passenger, bus, route, conductor    
                              (optional), payment method, amount, offline flag, and sync status.
-----------------------------------------------------------------------------------------
DIGITAL_RECEIPT	     |        The receipt for a transaction, with its code, time issued, and
                              delivery method.
-----------------------------------------------------------------------------------------
BUS	                 |        Each bus's plate number, bus number, capacity, and status.
-----------------------------------------------------------------------------------------
CONDUCTOR	         |        The conductor's name, contact info, and status.
-----------------------------------------------------------------------------------------
CONDUCTOR_ASSIGNMENT |	      Which conductor is assigned to which bus, and when.
-----------------------------------------------------------------------------------------
BUS_ASSIGNMENT	     |        Which bus is assigned to which route, and when.
-----------------------------------------------------------------------------------------
ROUTE	             |        A route's name, origin, destination, and status.
-----------------------------------------------------------------------------------------
BUS_STOP	         |        A stop's name and location.
-----------------------------------------------------------------------------------------
ROUTE_STOP	         |        The stops on each route, in order.
-----------------------------------------------------------------------------------------
FARE	             |        The base fare for a route, the fare type (such as student or
                              regular), and the date it takes effect.
-----------------------------------------------------------------------------------------
ADMIN	             |        The admin's name, username, and status.
-----------------------------------------------------------------------------------------
SYSTEM_LOG	         |        What each admin did and when, with details.
-----------------------------------------------------------------------------------------

## 4. Must-have features (for the final project)
1. Scan a passenger's card or QR ticket and deduct the correct fare, with the student discount applied.
2. Record each payment offline and sync it to the server when the connection returns.
3. Top up a balance through an e-wallet, kiosk cash, or the university accountant.
4. View balance, transaction history, and digital receipts in the passenger app.
5. Manage cards, buses, routes, and fares as an admin, and review the system log.
6. Share only limited student details (ID, name, card number, enrollment status) between the university and Bus Link.

## 5. Nice-to-have features (only if there's time)
1. An alarm feature on the app that goes off when the certain stop(selected by the user) is near.
2. Low-balance alert. The passenger app (or an SMS) warns when passenger.balance falls below a set amount, such as ₱50, so students don't get stuck at the scanner. 
3. Admin reports and CSV export. A dashboard of daily income per route, riders per hour, and student vs regular riders, with an export button.

## 6. Similar apps I looked at
1. Beep card (Philippines): a tap-to-pay stored-value card for trains and buses. Bus Link borrows the tap-and-go card idea and loading money at a station (our kiosk).
2. GCash: e-wallet top-up and a transaction list with reference numbers. Bus Link borrows the receipt reference numbers and the history list.